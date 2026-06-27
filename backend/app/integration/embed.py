"""进程内嵌入：无需启动 uvicorn，git clone 后 import 即可用。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import get_settings
from app.shield.gateway import gateway
from app.shield.policy_engine import policy_engine

_ready = False


def _ensure_ready() -> None:
    global _ready
    if _ready:
        return
    from app.core.database import init_db

    init_db()
    _ready = True


def configure(
    *,
    policy_file: Optional[str] = None,
    profile: Optional[str] = None,
) -> None:
    """
    可选：指定策略文件或演示场景包后再 evaluate。
    policy_file 示例: ./config/my_policy.yaml
    profile 示例: campus | personal | enterprise
    """
    if policy_file:
        os.environ["POLICY_FILE"] = str(Path(policy_file).resolve())
        get_settings.cache_clear()
    if profile:
        from app.models.policy import get_policy_loader

        get_policy_loader().switch_profile(profile)
    policy_engine.reload()
    _ensure_ready()


def evaluate(
    *,
    user_role: str,
    tool_name: str,
    tool_args: Optional[Dict[str, Any]] = None,
    user_id: str = "embed-user",
    user_input: str = "",
    session_id: str = "",
    agent_plan: str = "",
) -> Dict[str, Any]:
    """
    在工具执行前调用，返回决策。不执行你的真实工具 —— 由你根据 execute_allowed 决定。

    示例:
        from app.integration.embed import evaluate
        r = evaluate(user_role="student", tool_name="read_file", tool_args={"path": "secret.txt"})
        if r["execute_allowed"]:
            run_your_tool()
    """
    _ensure_ready()
    decision = gateway.evaluate_tool_call(
        user_context={
            "user_id": user_id,
            "user_role": user_role,
            "user_input": user_input,
            "session_id": session_id or "embed",
            "agent_plan": agent_plan or "embed evaluate",
        },
        tool_call={"tool_name": tool_name, "tool_args": tool_args or {}},
    )
    execute_allowed = decision.decision in ("allow", "mask")
    messages = {
        "allow": "允许执行，请调用你的真实工具",
        "mask": "允许执行，请对返回结果脱敏",
        "confirm": f"需人工确认，audit_id={decision.audit_id}",
        "block": "已阻断，请勿执行工具",
    }
    return {
        "decision": decision.decision,
        "execute_allowed": execute_allowed,
        "risk_score": decision.risk_score,
        "risk_level": decision.risk_level,
        "reason": decision.reason,
        "audit_id": decision.audit_id,
        "message": messages.get(decision.decision, decision.reason),
        "semantic_hits": decision.semantic_hits,
    }


def guard_tool(fn=None, *, tool_name: Optional[str] = None):
    """装饰器别名：与 wrapper.shield_tool 相同，嵌入模式推荐入口。"""
    from app.integration.wrapper import shield_tool

    if fn is not None:
        return shield_tool(tool_name)(fn)
    return shield_tool(tool_name)
