from fastapi import APIRouter, HTTPException, status

from app.api.deps import get_current_user
from app.core.auth import (
    LoginRequest,
    TokenResponse,
    TokenUser,
    authenticate_user,
    create_access_token,
    get_active_profile_demo_accounts,
)
from fastapi import Depends

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest):
    user = authenticate_user(request.username.strip(), request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        user_id=user.user_id,
        user_role=user.user_role,
        name=user.name,
    )


@router.get("/auth/me", response_model=TokenUser)
def me(current_user: TokenUser = Depends(get_current_user)):
    return current_user


@router.get("/auth/demo-accounts")
def demo_accounts():
    """当前场景策略包推荐的演示登录账号。"""
    accounts = get_active_profile_demo_accounts()
    return [
        {
            "username": a.username,
            "password": a.password,
            "role": a.role,
            "name": a.name,
            "label": a.name,
        }
        for a in accounts
    ]
