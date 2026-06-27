from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.schemas.confirm import ConfirmRequest, ConfirmResponse
from app.shield.gateway import gateway

router = APIRouter()


@router.post("/shield/confirm/{audit_id}", response_model=ConfirmResponse)
def confirm_tool_execution(
    audit_id: int,
    request: ConfirmRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    try:
        decision = gateway.confirm_pending(audit_id, approved=request.approved)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if request.approved:
        status = "executed" if decision.executed else "approved_not_executed"
        message = (
            "人工确认通过，工具已执行"
            if decision.executed
            else f"人工确认通过，但执行未成功: {decision.result_preview}"
        )
    else:
        status = "cancelled"
        message = "用户已取消该工具调用"

    return ConfirmResponse(
        status=status,
        message=message,
        original_audit_id=audit_id,
        shield_decision=decision,
    )
