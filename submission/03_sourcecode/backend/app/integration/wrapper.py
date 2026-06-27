"""进程内 SDK：用装饰器把任意 Python 工具函数接入 AgentShield。"""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, Dict, Optional

from app.shield.gateway import gateway


class ShieldToolContext:
    """在同步代码中传递用户上下文（LangChain / 自研 Agent 在调用前 set 一次）。"""

    user_id: str = "anonymous"
    user_role: str = "operator"
    user_input: str = ""
    session_id: str = ""
    agent_plan: str = ""


_ctx = ShieldToolContext()


def set_shield_context(
    *,
    user_id: str = "anonymous",
    user_role: str = "operator",
    user_input: str = "",
    session_id: str = "",
    agent_plan: str = "",
) -> None:
    _ctx.user_id = user_id
    _ctx.user_role = user_role
    _ctx.user_input = user_input
    _ctx.session_id = session_id
    _ctx.agent_plan = agent_plan


def shield_tool(tool_name: Optional[str] = None) -> Callable:
    """装饰器：执行前先走 gateway.evaluate_tool_call，block/confirm 时抛错或返回提示。"""

    def decorator(fn: Callable) -> Callable:
        name = tool_name or fn.__name__

        @wraps(fn)
        def wrapper(*args, **kwargs):
            tool_args = kwargs.copy()
            if args:
                tool_args["_args"] = list(args)
            decision = gateway.evaluate_tool_call(
                user_context={
                    "user_id": _ctx.user_id,
                    "user_role": _ctx.user_role,
                    "user_input": _ctx.user_input,
                    "session_id": _ctx.session_id,
                    "agent_plan": _ctx.agent_plan or f"shield_tool:{name}",
                },
                tool_call={"tool_name": name, "tool_args": tool_args},
            )
            if decision.decision == "block":
                raise PermissionError(f"[AgentShield] {decision.reason}")
            if decision.decision == "confirm":
                raise PermissionError(
                    f"[AgentShield] 需人工确认 (audit_id={decision.audit_id}): {decision.reason}"
                )
            result = fn(*args, **kwargs)
            return result

        wrapper.__shield_tool_name__ = name  # type: ignore[attr-defined]
        return wrapper

    return decorator
