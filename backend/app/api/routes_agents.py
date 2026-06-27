from fastapi import APIRouter, Depends

from app.agents.langchain_runner import run_langchain_integration
from app.agents.mcp_runner import run_mcp_integration
from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.schemas.agents import (
    AgentFrameworkInfo,
    AgentIntegrationRequest,
    AgentIntegrationResponse,
)

router = APIRouter()


@router.get("/agents/frameworks", response_model=list[AgentFrameworkInfo])
def list_agent_frameworks(current_user: TokenUser = Depends(get_current_user)):
    return [
        AgentFrameworkInfo(
            id="langchain",
            name="LangChain",
            description="通过 LangChain StructuredTool 调用工具，执行前经 AgentShield 网关拦截",
            endpoint="/api/agents/langchain/run",
        ),
        AgentFrameworkInfo(
            id="mcp",
            name="MCP (Model Context Protocol)",
            description="通过 MCP Client 连接 AgentShield MCP Server，工具调用走标准 MCP 协议",
            endpoint="/api/agents/mcp/run",
        ),
    ]


@router.post("/agents/langchain/run", response_model=AgentIntegrationResponse)
async def run_langchain_agent(
    request: AgentIntegrationRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    return await run_langchain_integration(
        user_id=current_user.user_id,
        user_role=current_user.user_role,
        message=request.message.strip(),
        session_id=request.session_id,
    )


@router.post("/agents/mcp/run", response_model=AgentIntegrationResponse)
async def run_mcp_agent(
    request: AgentIntegrationRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    return await run_mcp_integration(
        user_id=current_user.user_id,
        user_role=current_user.user_role,
        message=request.message.strip(),
        session_id=request.session_id,
    )
