from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.shield import ShieldDecision


class AgentIntegrationRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ToolTraceItem(BaseModel):
    tool_name: str
    tool_args: Dict[str, Any] = {}
    decision: str = ""
    risk_score: int = 0
    executed: bool = False
    result_preview: str = ""


class AgentIntegrationResponse(BaseModel):
    framework: str = Field(description="langchain | mcp")
    mode: str = Field(description="运行模式，如 langchain_mock / mcp_inprocess_client")
    answer: str = ""
    agent_plan: str = ""
    planned_tool_calls: List[Dict[str, Any]] = []
    tool_trace: List[ToolTraceItem] = []
    shield_decisions: List[ShieldDecision] = []
    session_id: str = ""


class AgentFrameworkInfo(BaseModel):
    id: str
    name: str
    description: str
    endpoint: str
