import uuid
from typing import Generator

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.core.database import get_session
from app.models.audit import AuditLog
from app.schemas.shield import AuditLogResponse

router = APIRouter()


@router.get("/audit", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: TokenUser = Depends(get_current_user),
):
    logs = session.exec(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    ).all()
    return logs


@router.get("/audit/{audit_id}", response_model=AuditLogResponse)
def get_audit_log(
    audit_id: int,
    session: Session = Depends(get_session),
    current_user: TokenUser = Depends(get_current_user),
):
    log = session.get(AuditLog, audit_id)
    if not log:
        raise HTTPException(status_code=404, detail="审计日志不存在")
    return log
