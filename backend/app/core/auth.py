from datetime import datetime, timedelta, timezone
from typing import List, Optional

from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings
from app.models.policy import DemoAccount, get_profile_manager

ALGORITHM = "HS256"


class TokenUser(BaseModel):
    user_id: str
    user_role: str
    name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    user_role: str
    name: str


def _demo_user_map() -> dict:
    """合并所有场景演示账号（用户名全局唯一）。"""
    users = {}
    for acc in get_profile_manager().all_demo_accounts():
        users[acc.username] = {
            "password": acc.password,
            "role": acc.role,
            "name": acc.name or acc.username,
        }
    return users


def authenticate_user(username: str, password: str) -> Optional[TokenUser]:
    record = _demo_user_map().get(username)
    if not record or record["password"] != password:
        return None
    return TokenUser(
        user_id=username,
        user_role=record["role"],
        name=record.get("name", username),
    )


def get_active_profile_demo_accounts() -> List[DemoAccount]:
    return get_profile_manager().demo_accounts_for_active()


def create_access_token(user: TokenUser) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": user.user_id,
        "role": user.user_role,
        "name": user.name,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenUser:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or not role:
            raise JWTError("invalid payload")
        return TokenUser(
            user_id=user_id,
            user_role=role,
            name=payload.get("name", user_id),
        )
    except JWTError as e:
        raise ValueError(str(e)) from e
