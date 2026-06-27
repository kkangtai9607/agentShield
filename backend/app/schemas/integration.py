"""通用集成 API 请求/响应模型。"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.shield import ShieldDecision


class ShieldEvaluateRequest(BaseModel):
    """任意 Agent 在工具执行前提交的检查请求（不执行工具，由调用方自行执行）。"""

    user_id: str = "anonymous"
    user_role: str = Field(..., description="须与 policy.yaml 中 role_permissions 的 key 一致")
    tool_name: str
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    user_input: str = ""
    session_id: str = ""
    agent_plan: str = ""
    framework: str = ""


class ShieldEvaluateResponse(BaseModel):
    decision: ShieldDecision
    execute_allowed: bool
    message: str


class IntegrationMode(BaseModel):
    id: str
    name: str
    description: str
    steps: List[str]


class IntegrationGuideResponse(BaseModel):
    modes: List[IntegrationMode]
    policy_template_path: str
    agentshield_config_example_path: str
    evaluate_endpoint: str
    quick_start: List[str]
    live_site_url: str = "https://agentshieldtop.xyz"
    github_repo_url: str = "https://github.com/kkangtai9607/agentShield"
