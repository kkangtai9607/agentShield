from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: str = Field(default="unknown")
    user_role: str = Field(default="student")
    session_id: str = Field(default="")
    user_input: str = Field(default="")
    agent_plan: str = Field(default="")
    tool_name: str = Field(default="")
    tool_args: str = Field(default="")
    risk_score: int = Field(default=0)
    risk_level: str = Field(default="low")
    decision: str = Field(default="allow")
    reason: str = Field(default="")
    result_preview: str = Field(default="")
