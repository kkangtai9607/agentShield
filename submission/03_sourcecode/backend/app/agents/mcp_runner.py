from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List

from mcp.shared.memory import create_connected_server_and_client_session

from app.agent.simple_agent import build_mock_plan
from app.agents.context import AgentRunContext, run_context_var
from app.agents.mcp_server import mcp
from app.core.config import get_settings
from app.schemas.agents import AgentIntegrationResponse, ToolTraceItem

logger = logging.getLogger(__name__)


def _extract_mcp_text(result) -> str:
    if hasattr(result, "content") and result.content:
        parts = []
        for block in result.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        if parts:
            return "\n".join(parts)
    return str(result)


async def _call_mcp_tools(
    session,
    tool_calls: List[Dict[str, Any]],
) -> List[str]:
    outputs: List[str] = []
    for tc in tool_calls:
        name = tc["tool_name"]
        args = tc.get("tool_args", {})
        try:
            result = await session.call_tool(name, args)
            text = _extract_mcp_text(result)
            outputs.append(f"[MCP Tool:{name}] {text[:300]}")
        except Exception as e:
            outputs.append(f"[MCP Tool:{name}] 调用异常: {e}")
    return outputs


async def run_mcp_integration(
    user_id: str,
    user_role: str,
    message: str,
    session_id: str | None = None,
) -> AgentIntegrationResponse:
    sid = session_id or str(uuid.uuid4())
    ctx = AgentRunContext(
        user_id=user_id,
        user_role=user_role,
        user_input=message,
        session_id=sid,
        agent_framework="mcp",
    )
    token = run_context_var.set(ctx)

    try:
        plan = build_mock_plan(message)
        ctx.agent_plan = plan.get("thought", "")
        planned_calls = plan.get("tool_calls", [])

        async with create_connected_server_and_client_session(mcp) as session:
            listed = await session.list_tools()
            mcp_tool_names = {t.name for t in listed.tools}

            outputs: List[str] = [
                f"MCP 已连接，可用工具: {', '.join(sorted(mcp_tool_names))}",
            ]

            if not planned_calls:
                answer = (
                    f"MCP Client 思考: {ctx.agent_plan}\n"
                    "（未生成工具调用，请使用页面快捷示例）"
                )
                mode = "mcp_mock"
            else:
                tool_outputs = await _call_mcp_tools(session, planned_calls)
                outputs.extend(tool_outputs)
                answer = f"MCP Agent 计划: {ctx.agent_plan}\n" + "\n".join(outputs)
                blocked = [d for d in ctx.shield_decisions if d.decision == "block"]
                if blocked:
                    answer += "\nAgentShield 已阻断高风险 MCP 工具调用。"
                mode = "mcp_inprocess_client"

        settings = get_settings()
        if not settings.use_mock_llm:
            mode += "+llm_available"

        return AgentIntegrationResponse(
            framework="mcp",
            mode=mode,
            answer=answer,
            agent_plan=ctx.agent_plan,
            planned_tool_calls=planned_calls,
            tool_trace=[ToolTraceItem(**t) for t in ctx.tool_trace],
            shield_decisions=ctx.shield_decisions,
            session_id=sid,
        )
    finally:
        run_context_var.reset(token)
