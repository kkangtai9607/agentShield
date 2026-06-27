from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.auth import TokenUser
from app.core.config import BASE_DIR
from app.schemas.integration import (
    IntegrationGuideResponse,
    IntegrationMode,
    ShieldEvaluateRequest,
    ShieldEvaluateResponse,
)
from app.shield.gateway import gateway

router = APIRouter()


@router.post("/shield/evaluate", response_model=ShieldEvaluateResponse)
def evaluate_tool_call(
    body: ShieldEvaluateRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    """
    通用集成入口：任意 Agent 在**执行工具前**调用。
    只返回决策与审计 ID，不代为执行工具 —— 由调用方根据 execute_allowed 自行执行。
    """
    user_context = {
        "user_id": body.user_id or current_user.user_id,
        "user_role": body.user_role or current_user.user_role,
        "user_input": body.user_input,
        "session_id": body.session_id,
        "agent_plan": body.agent_plan or body.framework or "external agent",
    }
    decision = gateway.evaluate_tool_call(
        user_context=user_context,
        tool_call={"tool_name": body.tool_name, "tool_args": body.tool_args},
    )
    execute_allowed = decision.decision in ("allow", "mask")
    messages = {
        "allow": "允许执行，请由 Agent 调用真实工具",
        "mask": "允许执行，请对返回结果脱敏",
        "confirm": f"需人工确认，audit_id={decision.audit_id}",
        "block": "已阻断，请勿执行工具",
    }
    return ShieldEvaluateResponse(
        decision=decision,
        execute_allowed=execute_allowed,
        message=messages.get(decision.decision, decision.reason),
    )


@router.get("/integration/guide", response_model=IntegrationGuideResponse)
def integration_guide(current_user: TokenUser = Depends(get_current_user)):
    return IntegrationGuideResponse(
        modes=[
            IntegrationMode(
                id="online",
                name="在线体验（零配置）",
                description="打开控制台「快速集成 → 在线试集成」，登录即用，无需 curl。",
                steps=[
                    "登录演示账号",
                    "填写角色、工具名、参数",
                    "点击立即评估，查看 execute_allowed",
                ],
            ),
            IntegrationMode(
                id="embed",
                name="嵌入模式（推荐）",
                description="from app.integration import evaluate — 进程内调用，无需 uvicorn。",
                steps=[
                    "PYTHONPATH=. python ../examples/minimal_embed.py",
                    "或 configure(policy_file=...) + evaluate(...)",
                    "execute_allowed 为 true 时执行真实工具",
                ],
            ),
            IntegrationMode(
                id="cli",
                name="CLI 一键",
                description="python -m app.integration.cli check / init / demo",
                steps=[
                    "cli check --role ... --tool ... --args '{}'",
                    "cli init 生成策略与示例脚本",
                ],
            ),
            IntegrationMode(
                id="http",
                name="HTTP API（可选）",
                description="分离部署时使用 POST /api/shield/evaluate（建议同源，勿硬编码 localhost）。",
                steps=[
                    "登录获取 JWT",
                    "POST 当前站点 /api/shield/evaluate",
                    "根据 execute_allowed 执行真实工具",
                ],
            ),
            IntegrationMode(
                id="python_sdk",
                name="Python 装饰器",
                description="from app.integration import guard_tool, set_shield_context",
                steps=[
                    "@guard_tool() 装饰你的工具函数",
                    "调用前 set_shield_context(user_role=...)",
                ],
            ),
            IntegrationMode(
                id="langchain",
                name="LangChain StructuredTool",
                description="工具 invoke 内调用 execute_via_shield",
                steps=["参考 app/agents/langchain_tools.py"],
            ),
            IntegrationMode(
                id="mcp",
                name="MCP Server",
                description="python -m app.agents.mcp_server",
                steps=["Cursor / Claude Desktop 配置 stdio"],
            ),
        ],
        policy_template_path="config/user_policy.template.yaml",
        agentshield_config_example_path="config/agentshield.yaml.example",
        evaluate_endpoint="/api/shield/evaluate",
        quick_start=[
            "评委：打开「快速集成 → 在线试集成」，零配置体验",
            "开发者：git clone → PYTHONPATH=. python ../examples/minimal_embed.py",
            "集成：from app.integration import evaluate；execute_allowed 时再执行真实工具",
            "可选 HTTP：POST 当前站点 /api/shield/evaluate（非 127.0.0.1 硬编码）",
        ],
    )


@router.get("/integration/templates/policy")
def download_policy_template(current_user: TokenUser = Depends(get_current_user)):
    path = BASE_DIR / "config" / "user_policy.template.yaml"
    if not path.exists():
        path = BASE_DIR / "app" / "policies" / "user_policy.template.yaml"
    return {"content": path.read_text(encoding="utf-8"), "filename": "user_policy.template.yaml"}
