import logging
import uuid

from fastapi import APIRouter, Depends

from app.agent.simple_agent import simple_agent
from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.schemas.chat import ChatRequest, ChatResponse, ToolResult
from app.shield.gateway import gateway

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    session_id = request.session_id or str(uuid.uuid4())

    logger.info("CHAT_REQUEST: user=%s role=%s", current_user.user_id, current_user.user_role)

    plan = await simple_agent.plan(request.message.strip())

    user_context = {
        "user_id": current_user.user_id,
        "user_role": current_user.user_role,
        "user_input": request.message,
        "session_id": session_id,
        "agent_plan": plan.thought,
    }

    session_context: dict = {}
    shield_decisions = []
    tool_results = []

    for tc in plan.tool_calls:
        tool_call_dict = {
            "tool_name": tc.tool_name,
            "tool_args": tc.tool_args,
        }
        decision = gateway.intercept_tool_call(
            user_context=user_context,
            tool_call=tool_call_dict,
            session_context=session_context,
        )
        shield_decisions.append(decision)

        if decision.executed:
            tool_results.append(
                ToolResult(
                    tool_name=tc.tool_name,
                    tool_args=tc.tool_args,
                    success=True,
                    result=decision.result_preview,
                )
            )
        elif decision.decision == "block":
            tool_results.append(
                ToolResult(
                    tool_name=tc.tool_name,
                    tool_args=tc.tool_args,
                    success=False,
                    error=decision.reason,
                )
            )

    answer = simple_agent.build_answer(plan, shield_decisions)

    return ChatResponse(
        answer=answer,
        agent_plan=plan,
        tool_results=tool_results,
        shield_decisions=shield_decisions,
        session_id=session_id,
    )
