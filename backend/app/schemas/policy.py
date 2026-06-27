from typing import Any, Dict, List

from pydantic import BaseModel

from app.models.policy import DemoAccount, PolicyConfig, PolicyProfileInfo


class PolicyConfigResponse(BaseModel):
    policy: Dict[str, Any]
    active_profile: str
    profile_name: str
    profile_description: str = ""
    role_labels: Dict[str, str] = {}


class PolicyProfilesResponse(BaseModel):
    active_profile: str
    profiles: List[PolicyProfileInfo]


class ActivateProfileResponse(BaseModel):
    active_profile: str
    profile_name: str
    policy: Dict[str, Any]
    role_labels: Dict[str, str] = {}
    demo_accounts: List[DemoAccount] = []
