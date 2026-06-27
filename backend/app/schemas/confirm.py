from pydantic import BaseModel, Field

from app.schemas.shield import ShieldDecision


class ConfirmRequest(BaseModel):
    approved: bool = Field(description="true=批准执行, false=取消")


class ConfirmResponse(BaseModel):
    status: str
    message: str
    original_audit_id: int
    shield_decision: ShieldDecision
