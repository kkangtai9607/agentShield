import json
from typing import Any, Dict, Optional

from sqlmodel import Session

from app.core.database import engine
from app.models.audit import AuditLog
from app.schemas.shield import ShieldDecision
from app.shield.content_guard import check_content
from app.shield.policy_engine import policy_engine
from app.tools.browser_mock import browser_mock
from app.tools.query_db import query_db
from app.tools.read_file import read_file
from app.tools.run_shell import run_shell
from app.tools.send_email import send_email

TOOL_REGISTRY = {
    "read_file": read_file,
    "send_email": send_email,
    "query_db": query_db,
    "run_shell": run_shell,
    "browser_mock": browser_mock,
}


class ShieldGateway:
    def intercept_tool_call(
        self,
        user_context: Dict[str, Any],
        tool_call: Dict[str, Any],
        session_context: Dict[str, Any],
        *,
        skip_confirm_gate: bool = False,
        confirmed_from_audit_id: Optional[int] = None,
    ) -> ShieldDecision:
        user_id = user_context.get("user_id", "unknown")
        user_role = user_context.get("user_role", "student")
        user_input = user_context.get("user_input", "")
        session_id = user_context.get("session_id", "")
        agent_plan = user_context.get("agent_plan", "")

        tool_name = tool_call.get("tool_name", "")
        tool_args = tool_call.get("tool_args", {})

        eval_result = policy_engine.evaluate(
            user_role=user_role,
            tool_name=tool_name,
            tool_args=tool_args,
            user_input=user_input,
            session_context=session_context,
        )

        decision = eval_result["decision"]
        reason = eval_result["reason"]
        if eval_result.get("suggestion"):
            reason = f"{reason}; 建议: {eval_result['suggestion']}"

        result_preview = ""
        executed = False

        if decision == "block":
            result_preview = "操作已被 AgentShield 阻断"
        elif decision == "confirm" and not skip_confirm_gate:
            result_preview = "操作需要人工确认，暂未执行"
        elif decision in ("allow", "mask", "confirm"):
            if decision == "confirm" and skip_confirm_gate:
                reason = f"{reason}; 人工确认已通过 (原审计 #{confirmed_from_audit_id})"
                decision = "allow"
            tool_fn = TOOL_REGISTRY.get(tool_name)
            if tool_fn:
                try:
                    raw_result = tool_fn(**tool_args)
                    executed = True

                    if tool_name == "read_file" and "secret" in str(
                        tool_args.get("path", "")
                    ).lower():
                        session_context["read_sensitive_file"] = True

                    guarded_text, content_score, content_reason = check_content(
                        str(raw_result)
                    )
                    if content_score > 0:
                        eval_result["risk_score"] = min(
                            eval_result["risk_score"] + content_score, 100
                        )
                        if content_reason:
                            reason = f"{reason}; {content_reason}"
                        if decision == "allow" and content_score >= 30:
                            decision = "mask"
                            guarded_text = guarded_text

                    if decision == "mask":
                        from app.shield.sensitive_detector import mask_sensitive

                        result_preview = mask_sensitive(str(raw_result))[:500]
                    else:
                        result_preview = str(guarded_text)[:500]
                except Exception as e:
                    executed = False
                    result_preview = f"工具执行失败: {str(e)}"
                    reason = f"{reason}; 执行错误: {str(e)}"
            else:
                result_preview = f"未知工具: {tool_name}"
                reason = f"{reason}; 工具未注册"

        audit_id = self._write_audit(
            user_id=user_id,
            user_role=user_role,
            session_id=session_id,
            user_input=user_input,
            agent_plan=agent_plan,
            tool_name=tool_name,
            tool_args=json.dumps(tool_args, ensure_ascii=False),
            risk_score=eval_result["risk_score"],
            risk_level=eval_result["risk_level"],
            decision=decision,
            reason=reason,
            result_preview=result_preview,
        )

        return ShieldDecision(
            tool_name=tool_name,
            tool_args=tool_args,
            risk_score=eval_result["risk_score"],
            risk_level=eval_result["risk_level"],
            decision=decision,
            reason=reason,
            executed=executed,
            result_preview=result_preview,
            audit_id=audit_id,
            semantic_hits=eval_result.get("semantic_hits", []),
            semantic_mode=eval_result.get("semantic_mode", "off"),
        )

    def evaluate_tool_call(
        self,
        user_context: Dict[str, Any],
        tool_call: Dict[str, Any],
        session_context: Optional[Dict[str, Any]] = None,
    ) -> ShieldDecision:
        """仅评估 + 审计，不执行工具（供外部 Agent 即插即用集成）。"""
        session_context = session_context if session_context is not None else {}
        user_id = user_context.get("user_id", "unknown")
        user_role = user_context.get("user_role", "student")
        user_input = user_context.get("user_input", "")
        session_id = user_context.get("session_id", "")
        agent_plan = user_context.get("agent_plan", "")
        tool_name = tool_call.get("tool_name", "")
        tool_args = tool_call.get("tool_args", {})

        eval_result = policy_engine.evaluate(
            user_role=user_role,
            tool_name=tool_name,
            tool_args=tool_args,
            user_input=user_input,
            session_context=session_context,
        )
        decision = eval_result["decision"]
        reason = eval_result["reason"]
        if eval_result.get("suggestion"):
            reason = f"{reason}; 建议: {eval_result['suggestion']}"

        previews = {
            "block": "操作已被 AgentShield 阻断（未执行）",
            "confirm": "操作需要人工确认（未执行）",
            "mask": "允许执行，返回结果需脱敏",
            "allow": "允许执行",
        }
        result_preview = previews.get(decision, "")

        audit_id = self._write_audit(
            user_id=user_id,
            user_role=user_role,
            session_id=session_id,
            user_input=user_input,
            agent_plan=agent_plan,
            tool_name=tool_name,
            tool_args=json.dumps(tool_args, ensure_ascii=False),
            risk_score=eval_result["risk_score"],
            risk_level=eval_result["risk_level"],
            decision=decision,
            reason=reason,
            result_preview=result_preview,
        )

        return ShieldDecision(
            tool_name=tool_name,
            tool_args=tool_args,
            risk_score=eval_result["risk_score"],
            risk_level=eval_result["risk_level"],
            decision=decision,
            reason=reason,
            executed=False,
            result_preview=result_preview,
            audit_id=audit_id,
            semantic_hits=eval_result.get("semantic_hits", []),
            semantic_mode=eval_result.get("semantic_mode", "off"),
        )

    def confirm_pending(self, audit_id: int, approved: bool) -> ShieldDecision:
        """人工确认闭环：批准则执行原 pending 工具调用并写新审计。"""
        with Session(engine) as session:
            log = session.get(AuditLog, audit_id)
            if not log:
                raise ValueError(f"审计记录不存在: {audit_id}")
            if log.decision != "confirm":
                raise ValueError(f"审计 #{audit_id} 不是待确认状态 (当前: {log.decision})")
            log_data = {
                "user_id": log.user_id,
                "user_role": log.user_role,
                "session_id": log.session_id,
                "user_input": log.user_input,
                "agent_plan": log.agent_plan,
                "tool_name": log.tool_name,
                "tool_args": log.tool_args,
                "risk_score": log.risk_score,
                "risk_level": log.risk_level,
            }

        if not approved:
            self._resolve_original_audit(
                audit_id,
                decision="block",
                reason_suffix="人工确认已拒绝",
                result_preview="操作已取消，未执行",
            )
            return ShieldDecision(
                tool_name=log_data["tool_name"],
                tool_args=json.loads(log_data["tool_args"] or "{}"),
                risk_score=log_data["risk_score"],
                risk_level=log_data["risk_level"],
                decision="block",
                reason="用户取消人工确认",
                executed=False,
                result_preview="操作已取消，未执行",
                audit_id=audit_id,
            )

        tool_args = json.loads(log_data["tool_args"] or "{}")
        user_context = {
            "user_id": log_data["user_id"],
            "user_role": log_data["user_role"],
            "user_input": log_data["user_input"],
            "session_id": log_data["session_id"],
            "agent_plan": log_data["agent_plan"],
        }
        execution = self.intercept_tool_call(
            user_context=user_context,
            tool_call={"tool_name": log_data["tool_name"], "tool_args": tool_args},
            session_context={},
            skip_confirm_gate=True,
            confirmed_from_audit_id=audit_id,
        )
        self._resolve_original_audit(
            audit_id,
            decision=execution.decision,
            reason_suffix="人工确认已通过",
            result_preview=execution.result_preview,
            risk_score=execution.risk_score,
            risk_level=execution.risk_level,
        )
        return ShieldDecision(
            tool_name=execution.tool_name,
            tool_args=execution.tool_args,
            risk_score=execution.risk_score,
            risk_level=execution.risk_level,
            decision=execution.decision,
            reason=f"{execution.reason}; 人工确认已通过",
            executed=execution.executed,
            result_preview=execution.result_preview,
            audit_id=audit_id,
        )

    def _resolve_original_audit(
        self,
        audit_id: int,
        *,
        decision: str,
        reason_suffix: str,
        result_preview: str,
        risk_score: int | None = None,
        risk_level: str | None = None,
    ) -> None:
        with Session(engine) as session:
            log = session.get(AuditLog, audit_id)
            if not log:
                return
            log.decision = decision
            log.result_preview = result_preview
            log.reason = f"{log.reason}; {reason_suffix}"
            if risk_score is not None:
                log.risk_score = risk_score
            if risk_level is not None:
                log.risk_level = risk_level
            session.add(log)
            session.commit()

    def _write_audit(self, **kwargs) -> int:
        with Session(engine) as session:
            log = AuditLog(**kwargs)
            session.add(log)
            session.commit()
            session.refresh(log)
            return log.id


gateway = ShieldGateway()
