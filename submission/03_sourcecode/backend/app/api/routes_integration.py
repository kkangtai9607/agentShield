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
                description="访问 http://114.215.209.144:8088 → 快速集成 → 在线试集成，登录即用。",
                steps=[
                    "打开 http://114.215.209.144:8088 并登录演示账号",
                    "填写角色、工具名、参数",
                    "点击立即评估，查看 execute_allowed",
                ],
            ),
            IntegrationMode(
                id="embed",
                name="嵌入模式（推荐）",
                description="git clone https://github.com/huang08666/agentShield.git → from app.integration import evaluate",
                steps=[
                    "git clone 开源仓库，PYTHONPATH=. python ../examples/minimal_embed.py",
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
                description="POST http://114.215.209.144:8088/api/shield/evaluate（或自建同源地址）",
                steps=[
                    "登录获取 JWT",
                    "POST /api/shield/evaluate",
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
                name="MCP Server（Cursor / Claude / Trae）",
                description="python -m app.agents.mcp_server，配置 IDE mcp.json",
                steps=[
                    "git clone 后 pip install -r requirements.txt",
                    "Cursor: ~/.cursor/mcp.json 配置 stdio",
                    "Claude Desktop: claude_desktop_config.json",
                    "详见 INTEGRATION-AGENTS.md",
                ],
            ),
            IntegrationMode(
                id="claude_api",
                name="Claude API / OpenAI Codex",
                description="tool_use / tool_calls 循环内 POST /api/shield/evaluate",
                steps=[
                    "登录获取 JWT",
                    "每次 tool_call 前 evaluate",
                    "execute_allowed 时执行真实工具",
                ],
            ),
        ],
        policy_template_path="config/user_policy.template.yaml",
        agentshield_config_example_path="config/agentshield.yaml.example",
        evaluate_endpoint="/api/shield/evaluate",
        quick_start=[
            "评委：打开 http://114.215.209.144:8088 → 快速集成 → 在线试集成",
            "Cursor/Claude/Trae：配置 MCP → python -m app.agents.mcp_server（见 INTEGRATION-AGENTS.md）",
            "Claude API/Codex：tool 循环内 POST http://114.215.209.144:8088/api/shield/evaluate",
            "Python：git clone → from app.integration import evaluate",
        ],
        live_site_url="http://114.215.209.144:8088",
        github_repo_url="https://github.com/huang08666/agentShield",
    )


@router.get("/integration/templates/policy")
def download_policy_template(current_user: TokenUser = Depends(get_current_user)):
    path = BASE_DIR / "config" / "user_policy.template.yaml"
    if not path.exists():
        path = BASE_DIR / "app" / "policies" / "user_policy.template.yaml"
    return {"content": path.read_text(encoding="utf-8"), "filename": "user_policy.template.yaml"}
