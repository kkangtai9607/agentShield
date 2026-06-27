from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SemanticHitDetail(BaseModel):
    intent_id: str
    intent_label: str
    similarity: float
    matched_phrase: str
    channel: str


class ShieldDecision(BaseModel):
    tool_name: str
    tool_args: Dict[str, Any] = {}
    risk_score: int = 0
    risk_level: str = "low"
    decision: str = "allow"
    reason: str = ""
    executed: bool = False
    result_preview: str = ""
    audit_id: Optional[int] = None
    semantic_hits: List[SemanticHitDetail] = Field(default_factory=list)
    semantic_mode: str = "off"


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_id: str
    user_role: str
    session_id: str
    user_input: str
    agent_plan: str
    tool_name: str
    tool_args: str
    risk_score: int
    risk_level: str
    decision: str
    reason: str
    result_preview: str


class PolicyConfigResponse(BaseModel):
    policy: Dict[str, Any]
