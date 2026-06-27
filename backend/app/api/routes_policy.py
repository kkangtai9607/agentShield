from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.models.policy import PolicyConfig, get_policy_loader, get_profile_manager
from app.schemas.policy import (
    ActivateProfileResponse,
    PolicyConfigResponse,
    PolicyProfilesResponse,
)
from app.shield.policy_engine import policy_engine

router = APIRouter()


def _policy_response() -> PolicyConfigResponse:
    loader = get_policy_loader()
    manager = get_profile_manager()
    pid = loader.active_profile_id
    try:
        info = manager.get_profile_info(pid)
        name = info.name
        desc = info.description
        role_labels = info.role_labels
    except KeyError:
        name = pid
        desc = ""
        role_labels = {}
    return PolicyConfigResponse(
        policy=loader.config.model_dump(),
        active_profile=pid,
        profile_name=name,
        profile_description=desc,
        role_labels=role_labels,
    )


def _apply_policy(config: PolicyConfig) -> PolicyConfigResponse:
    loader = get_policy_loader()
    loader.save(config)
    policy_engine.reload()
    return _policy_response()


@router.get("/policies/profiles", response_model=PolicyProfilesResponse)
def list_policy_profiles(current_user: TokenUser = Depends(get_current_user)):
    manager = get_profile_manager()
    loader = get_policy_loader()
    return PolicyProfilesResponse(
        active_profile=loader.active_profile_id,
        profiles=manager.list_profiles(),
    )


@router.post("/policies/profile/{profile_id}/activate", response_model=ActivateProfileResponse)
def activate_policy_profile(
    profile_id: str,
    current_user: TokenUser = Depends(get_current_user),
):
    loader = get_policy_loader()
    manager = get_profile_manager()
    try:
        loader.switch_profile(profile_id)
        policy_engine.reload()
        info = manager.get_profile_info(profile_id)
    except (KeyError, FileNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return ActivateProfileResponse(
        active_profile=profile_id,
        profile_name=info.name,
        policy=loader.config.model_dump(),
        role_labels=info.role_labels,
        demo_accounts=info.demo_accounts,
    )


@router.get("/policies", response_model=PolicyConfigResponse)
def get_policies(current_user: TokenUser = Depends(get_current_user)):
    return _policy_response()


@router.put("/policies", response_model=PolicyConfigResponse)
def update_policies(
    config: PolicyConfig,
    current_user: TokenUser = Depends(get_current_user),
):
    """在线更新当前场景策略包并持久化到 profiles/{active}.yaml。"""
    try:
        return _apply_policy(config)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"策略保存失败: {e}") from e


@router.post("/policies/reload", response_model=PolicyConfigResponse)
def reload_policies(current_user: TokenUser = Depends(get_current_user)):
    get_policy_loader().reload()
    policy_engine.reload()
    return _policy_response()
