from __future__ import annotations

import logging
import uuid
from typing import Any, Dict, List

from app.agent.simple_agent import build_mock_plan
from app.agents.context import AgentRunContext, run_context_var
from app.agents.langchain_tools import build_langchain_tools
from app.core.config import get_settings
from app.schemas.agents import AgentIntegrationResponse, ToolTraceItem

logger = logging.getLogger(__name__)

LANGCHAIN_SYSTEM_PROMPT = """你是 LangChain Agent，根据用户请求调用可用工具。
可用工具: read_file, send_email, query_db, run_shell, browser_mock。
所有工具调用都会经过 AgentShield 安全网关检查。"""


def _tools_by_name(tools) -> Dict[str, Any]:
    return {t.name: t for t in tools}


async def _run_mock_langchain(
    ctx: AgentRunContext, message: str, tools
) -> tuple[str, List[Dict[str, Any]]]:
    """Mock 模式：用规则引擎生成计划，经 LangChain StructuredTool 执行。"""
    plan = build_mock_plan(message)
    ctx.agent_plan = plan.get("thought", "")
    tools_map = _tools_by_name(tools)

    outputs: List[str] = []
    for tc in plan.get("tool_calls", []):
        name = tc["tool_name"]
        args = tc.get("tool_args", {})
        tool = tools_map.get(name)
        if not tool:
            outputs.append(f"未知 LangChain 工具: {name}")
            continue
        try:
            result = tool.invoke(args)
            outputs.append(f"[LangChain Tool:{name}] {str(result)[:300]}")
        except Exception as e:
            outputs.append(f"[LangChain Tool:{name}] 执行异常: {e}")

    if not plan.get("tool_calls"):
        return f"{ctx.agent_plan}\n（LangChain Mock：未生成工具调用）", plan.get(
            "tool_calls", []
        )

    answer = f"LangChain Agent 思考: {ctx.agent_plan}\n" + "\n".join(outputs)
    blocked = [d for d in ctx.shield_decisions if d.decision == "block"]
    if blocked:
        answer += "\nAgentShield 已阻断高风险 LangChain 工具调用。"
    return answer, plan.get("tool_calls", [])


async def _run_llm_langchain(ctx: AgentRunContext, message: str, tools) -> tuple[str, List]:
    """真实 LLM 模式：LangChain create_agent + ChatOpenAI。"""
    from langchain.agents import create_agent
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    llm = ChatOpenAI(
        base_url=settings.API_BASE.rstrip("/"),
        api_key=settings.API_KEY,
        model=settings.MODEL_NAME,
        temperature=0.1,
    )
    agent = create_agent(llm, tools=tools, system_prompt=LANGCHAIN_SYSTEM_PROMPT)
    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": message}]}
    )

    messages = result.get("messages", [])
    answer_parts = ["LangChain Agent (LLM) 执行完成"]
    tool_calls_meta: List[Dict[str, Any]] = []

    for msg in messages:
        content = getattr(msg, "content", None)
        if content:
            answer_parts.append(str(content)[:500])
        msg_tool_calls = getattr(msg, "tool_calls", None) or []
        for tc in msg_tool_calls:
            if isinstance(tc, dict):
                tool_calls_meta.append(
                    {
                        "tool_name": tc.get("name", ""),
                        "tool_args": tc.get("args", {}),
                    }
                )

    ctx.agent_plan = "LangChain LLM 自主规划工具调用"
    return "\n".join(answer_parts), tool_calls_meta


async def run_langchain_integration(
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
        agent_framework="langchain",
    )
    token = run_context_var.set(ctx)
    tools = build_langchain_tools()

    try:
        settings = get_settings()
        if settings.use_mock_llm:
            answer, planned_calls = await _run_mock_langchain(ctx, message, tools)
            mode = "langchain_mock"
        else:
            try:
                answer, planned_calls = await _run_llm_langchain(ctx, message, tools)
                mode = "langchain_llm"
            except Exception as e:
                logger.warning("LangChain LLM 失败，回退 mock: %s", e)
                answer, planned_calls = await _run_mock_langchain(ctx, message, tools)
                mode = "langchain_mock_fallback"

        return AgentIntegrationResponse(
            framework="langchain",
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
