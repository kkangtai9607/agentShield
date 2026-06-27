import json
import re
from typing import Any, Dict, List, Optional

from app.models.policy import get_policy_loader
from app.shield.normalize import normalize_path, normalize_sql, normalize_shell, contains_insensitive
from app.shield.prompt_injection_detector import detect_prompt_injection
from app.shield.semantic_checker import apply_semantic_to_policy, run_semantic_check
from app.shield.sensitive_detector import detect_sensitive


class PolicyEngine:
    def __init__(self):
        self.loader = get_policy_loader()

    def reload(self):
        self.loader.reload()

    def _score_to_level(self, score: int) -> str:
        policy = self.loader.config
        for level_name, threshold in policy.decision_thresholds.items():
            if threshold["min"] <= score <= threshold["max"]:
                return level_name
        return "critical" if score >= 80 else "low"

    def _score_to_decision(self, score: int) -> str:
        policy = self.loader.config
        for threshold in policy.decision_thresholds.values():
            if threshold["min"] <= score <= threshold["max"]:
                return threshold["decision"]
        return "block"

    def _merge_decision(self, current: str, new: str) -> str:
        order = {"allow": 0, "mask": 1, "confirm": 2, "block": 3}
        return current if order.get(current, 0) >= order.get(new, 0) else new

    def evaluate(
        self,
        user_role: str,
        tool_name: str,
        tool_args: Dict[str, Any],
        user_input: str = "",
        session_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        policy = self.loader.config
        session_context = session_context or {}
        score = 0
        reasons: List[str] = []
        decision = "allow"
        suggestion = ""

        # A. Role permissions
        role_perms = policy.role_permissions.get(user_role, {})
        perm = role_perms.get(tool_name, "deny")
        if perm == "deny":
            score += 50
            reasons.append(f"角色 {user_role} 无权使用工具 {tool_name}")
            decision = self._merge_decision(decision, "block")
        elif perm == "confirm":
            score += 25
            reasons.append(f"角色 {user_role} 使用 {tool_name} 需要人工确认")
            decision = self._merge_decision(decision, "confirm")

        base_risk = policy.tool_risk_level.get(tool_name, "low")
        base_scores = {"low": 5, "medium": 10, "high": 15, "critical": 20}
        score += base_scores.get(base_risk, 5)

        # Prompt injection in user input
        inj_hits, inj_score = detect_prompt_injection(user_input)
        if inj_hits:
            score += inj_score
            reasons.append(f"用户输入含提示注入: {', '.join(inj_hits[:2])}")

        # Tool-specific rules
        if tool_name == "read_file":
            score, reasons, decision, suggestion = self._check_read_file(
                tool_args, score, reasons, decision, suggestion, policy
            )
        elif tool_name == "send_email":
            score, reasons, decision, suggestion = self._check_send_email(
                tool_args, score, reasons, decision, suggestion, policy, session_context
            )
        elif tool_name == "query_db":
            score, reasons, decision, suggestion = self._check_query_db(
                tool_args, score, reasons, decision, suggestion, policy
            )
        elif tool_name == "run_shell":
            score, reasons, decision, suggestion = self._check_run_shell(
                tool_args, score, reasons, decision, suggestion, policy
            )
        elif tool_name == "browser_mock":
            score, reasons, decision, suggestion = self._check_browser_mock(
                tool_args, score, reasons, decision, suggestion, policy, user_input
            )

        semantic = run_semantic_check(
            user_input=user_input,
            tool_name=tool_name,
            tool_args=tool_args,
        )
        score, reasons, decision = apply_semantic_to_policy(
            semantic, score, reasons, decision, self._merge_decision
        )

        score = min(score, 100)
        risk_level = self._score_to_level(score)
        threshold_decision = self._score_to_decision(score)
        decision = self._merge_decision(decision, threshold_decision)

        return {
            "decision": decision,
            "risk_score": score,
            "risk_level": risk_level,
            "reason": "; ".join(reasons) if reasons else "通过安全检查",
            "suggestion": suggestion,
            "semantic_hits": [h.to_dict() for h in semantic.hits],
            "semantic_mode": semantic.mode,
        }

    def _check_read_file(
        self, tool_args, score, reasons, decision, suggestion, policy
    ):
        path = normalize_path(str(tool_args.get("path", "")))
        collapsed = path.replace("/", "").replace(".", "").replace("-", "").replace("_", "")
        compact = collapsed.replace(" ", "")
        for sp in policy.sensitive_paths:
            sp_norm = normalize_path(sp)
            sp_compact = sp_norm.replace("/", "").replace(" ", "")
            if sp_norm and (sp_norm in path or sp_norm.replace("/", "") in collapsed or sp_compact in compact):
                score += 40
                reasons.append(f"敏感路径匹配: {sp}")
                decision = self._merge_decision(decision, "block")
        if "secret" in path or "secret" in collapsed or "secret" in compact:
            score += 35
            reasons.append("尝试读取 secret 文件")
            decision = self._merge_decision(decision, "block")
        return score, reasons, decision, suggestion

    def _check_send_email(
        self, tool_args, score, reasons, decision, suggestion, policy, session_context
    ):
        to_addr = str(tool_args.get("to", "")).lower()
        body = str(tool_args.get("body", ""))
        subject = str(tool_args.get("subject", ""))
        full_text = f"{to_addr} {subject} {body}"

        if "attacker" in to_addr:
            score += 45
            reasons.append("收件人包含 attacker")
            decision = self._merge_decision(decision, "block")

        for domain in policy.external_email_domains:
            if domain in to_addr:
                score += 10
                reasons.append(f"外部邮箱域名: {domain}")

        sensitive = detect_sensitive(f"{subject} {body}")
        if sensitive:
            score += min(len(sensitive) * 15, 45)
            reasons.append("邮件内容含敏感信息")
            decision = self._merge_decision(decision, "block")

        if session_context.get("read_sensitive_file"):
            score += 35
            reasons.append("邮件正文可能来自敏感文件读取结果")
            decision = self._merge_decision(decision, "block")

        inj_hits, inj_score = detect_prompt_injection(full_text)
        if inj_hits:
            score += inj_score
            reasons.append(f"邮件内容含提示注入: {', '.join(inj_hits[:2])}")

        return score, reasons, decision, suggestion

    def _check_query_db(self, tool_args, score, reasons, decision, suggestion, policy):
        sql = normalize_sql(str(tool_args.get("sql", "")))

        for pattern in policy.dangerous_sql_patterns:
            pat = normalize_sql(pattern)
            if pat and pat in sql:
                score += 30
                reasons.append(f"危险 SQL 模式: {pattern}")
                decision = self._merge_decision(decision, "block")

        if re.search(r"SELECT\s+\*\s+FROM\s+STUDENTS", sql):
            score += 40
            reasons.append("禁止 SELECT * FROM students 全表查询")
            suggestion = "建议使用: SELECT COUNT(*) FROM students"
            decision = self._merge_decision(decision, "block")

        if re.search(r"SELECT\s+FROM\s+STUDENTS", sql):
            score += 40
            reasons.append("可疑 SQL：SELECT 与 FROM 之间无列名（可能注释/空白绕过）")
            decision = self._merge_decision(decision, "block")

        if re.search(r"SELECT\s+COUNT\s*\(", sql):
            score = max(0, score - 15)
            if suggestion:
                suggestion = ""

        return score, reasons, decision, suggestion

    def _check_run_shell(self, tool_args, score, reasons, decision, suggestion, policy):
        command = normalize_shell(str(tool_args.get("command", "")))

        for pattern in policy.dangerous_shell_patterns:
            if contains_insensitive(command, pattern):
                score += 40
                reasons.append(f"危险 Shell 模式: {pattern}")
                decision = self._merge_decision(decision, "block")

        allowed = False
        for cmd in policy.allowed_shell_commands:
            if command.strip().startswith(cmd):
                allowed = True
                break
        if not allowed:
            score += 35
            reasons.append("命令不在白名单内")
            decision = self._merge_decision(decision, "block")

        return score, reasons, decision, suggestion

    def _check_browser_mock(
        self, tool_args, score, reasons, decision, suggestion, policy, user_input=""
    ):
        url = str(tool_args.get("url", "")).lower()
        full_text = f"{url} {user_input}".lower()

        suspicious_markers = ["evil.com", "attacker", "malicious", "evil.example"]
        for marker in suspicious_markers:
            if marker in url:
                score += 20
                reasons.append(f"可疑网页地址: {marker}")
                decision = self._merge_decision(decision, "confirm")

        inj_hits, inj_score = detect_prompt_injection(full_text)
        if inj_hits:
            score += inj_score
            reasons.append(f"浏览请求含提示注入: {', '.join(inj_hits[:2])}")
            decision = self._merge_decision(decision, "confirm")

        high_risk_keywords = [
            "reveal secret",
            "system prompt",
            "读取密钥",
            "ignore previous instructions",
            "忽略之前所有规则",
        ]
        for kw in high_risk_keywords:
            if kw.lower() in full_text:
                score += 25
                reasons.append(f"浏览目标含高风险内容: {kw}")
                decision = self._merge_decision(decision, "confirm")
                break

        if score >= 80:
            decision = self._merge_decision(decision, "block")

        return score, reasons, decision, suggestion


policy_engine = PolicyEngine()
