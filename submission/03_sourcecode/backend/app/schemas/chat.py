from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.shield import ShieldDecision


class ToolCall(BaseModel):
    tool_name: str
    tool_args: Dict[str, Any] = {}


class AgentPlan(BaseModel):
    thought: str = ""
    tool_calls: List[ToolCall] = []


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    # user_id / user_role 由 JWT 鉴权决定，请求体传入将被忽略


class ToolResult(BaseModel):
    tool_name: str
    tool_args: Dict[str, Any] = {}
    success: bool = True
    result: str = ""
    error: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    agent_plan: AgentPlan
    tool_results: List[ToolResult] = []
    shield_decisions: List[ShieldDecision] = []
    session_id: str = ""
