import { GITHUB_REPO_URL, LIVE_SITE_URL } from '../config/site'

/** MCP 配置模板中的路径占位符，用户需替换为本机 clone 路径 */
export const MCP_BACKEND_PATH = '/path/to/agentShield/backend'

export const AGENT_PLATFORM_ROWS = [
  { platform: 'Cursor', form: 'IDE + MCP', method: 'MCP Server', note: '配置 ~/.cursor/mcp.json' },
  { platform: 'Claude Desktop', form: '桌面 + MCP', method: 'MCP Server', note: 'claude_desktop_config.json' },
  { platform: 'Trae', form: 'IDE + MCP', method: 'MCP Server', note: '与 Cursor 相同 stdio 配置' },
  { platform: 'Claude API', form: '自研 Agent 服务', method: 'HTTP / embed', note: 'tool_use 循环内 evaluate' },
  { platform: 'OpenAI Codex / GPT', form: 'Tool calling API', method: 'HTTP / embed', note: 'tool_calls 循环内 evaluate' },
  { platform: 'LangChain', form: 'Python Agent', method: 'embed + langchain_tools', note: '仓库内置示例' },
] as const

export const MCP_CURSOR_CONFIG = `{
  "mcpServers": {
    "agentshield": {
      "command": "${MCP_BACKEND_PATH}/.venv/bin/python",
      "args": ["-m", "app.agents.mcp_server"],
      "cwd": "${MCP_BACKEND_PATH}",
      "env": {
        "PYTHONPATH": "${MCP_BACKEND_PATH}"
      }
    }
  }
}`

export const MCP_CLAUDE_CONFIG = MCP_CURSOR_CONFIG

export const MCP_SETUP_STEPS = `# 1. clone 并安装依赖
git clone ${GITHUB_REPO_URL}.git
cd agentShield/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. 验证 MCP 可启动
PYTHONPATH=. python -m app.agents.mcp_server

# 3. 将下方 JSON 写入 IDE 的 MCP 配置（路径改成本机实际路径）
#    Cursor:  ~/.cursor/mcp.json
#    Claude:  ~/Library/Application Support/Claude/claude_desktop_config.json
#    Trae:    按 IDE 文档配置 MCP stdio`

export const AGENT_LOOP_PYTHON = `from app.integration.sdk import ShieldClient

shield = ShieldClient("${LIVE_SITE_URL}", token=TOKEN)

# LLM 返回 tool_call 之后（Claude / OpenAI / 自研 Agent 通用）：
res = shield.evaluate(
    user_role="student",
    tool_name=tool_call.name,
    tool_args=tool_call.arguments,
    user_input=user_message,
    framework="claude",  # 或 openai / cursor / codex
)
if shield.should_execute(res):
    result = run_real_tool(tool_call.name, tool_call.arguments)
else:
    result = res["message"]  # 阻断原因，可喂回 LLM`

export const OPENAI_TOOL_LOOP = `# OpenAI Codex / GPT tool_calls 伪代码
for tool_call in response.choices[0].message.tool_calls or []:
    args = json.loads(tool_call.function.arguments)
    check = shield.evaluate(
        user_role="operator",
        tool_name=tool_call.function.name,
        tool_args=args,
        user_input=last_user_message,
        framework="openai",
    )
    if not shield.should_execute(check):
        results.append({"tool_call_id": tool_call.id, "output": check["message"]})
        continue
    output = execute_tool(tool_call.function.name, args)
    results.append({"tool_call_id": tool_call.id, "output": output})`

export const INTEGRATION_PRINCIPLE = `用户输入 → LLM 产出 tool_name + tool_args
              ↓
        AgentShield.evaluate()     ← 只判断，不执行真实工具
              ↓
    execute_allowed = true  → 你再调用 MCP / API / Shell
    block / confirm         → 不执行或人工确认`
