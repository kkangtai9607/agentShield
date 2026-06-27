from __future__ import annotations

from typing import Any, Dict

from app.agents.context import run_context_var
from app.shield.gateway import gateway


def execute_via_shield(tool_name: str, tool_args: Dict[str, Any]) -> str:
    """供 LangChain / MCP 工具调用的统一 Shield 入口。"""
    ctx = run_context_var.get()
    if ctx is None:
        raise RuntimeError("AgentRunContext 未初始化")

    user_context = {
        "user_id": ctx.user_id,
        "user_role": ctx.user_role,
        "user_input": ctx.user_input,
        "session_id": ctx.session_id,
        "agent_plan": ctx.agent_plan or f"{ctx.agent_framework} agent tool call",
    }

    decision = gateway.intercept_tool_call(
        user_context=user_context,
        tool_call={"tool_name": tool_name, "tool_args": tool_args},
        session_context=ctx.session_context,
    )
    ctx.shield_decisions.append(decision)

    trace_item = {
        "tool_name": tool_name,
        "tool_args": tool_args,
        "decision": decision.decision,
        "risk_score": decision.risk_score,
        "executed": decision.executed,
        "result_preview": decision.result_preview[:300],
    }
    ctx.tool_trace.append(trace_item)

    if decision.decision == "block":
        return f"[AgentShield 阻断] {decision.reason}"
    if decision.decision == "confirm":
        return f"[AgentShield 需人工确认] {decision.reason}"
    return decision.result_preview or f"[AgentShield {decision.decision}] 操作完成"
