# 主流 Agent 工具调用集成指南

> **在线演示**：<http://114.215.209.144:8088/integration-guide>  
> **开源仓库**：<https://github.com/huang08666/agentShield>  
> 本文说明如何将 AgentShield 接入 **Cursor、Claude、Trae、Codex（OpenAI）** 等主流 Agent 的 **Tool Calling / MCP** 流程。

---

## 一、核心原则（所有平台通用）

AgentShield 不替换你的 Agent，而是在 **LLM 产出 tool_call 之后、真实工具执行之前** 插入安全检查：

```text
用户输入 → LLM 规划 tool_name + tool_args
              ↓
        AgentShield.evaluate()     ← 只判断，不替你执行工具
              ↓
    execute_allowed = true  → 你再调用真实工具（MCP / API / Shell…）
    block / confirm         → 不执行，或等待人工确认
```

三种接入形态：

| 形态 | 适合 | 入口 |
|------|------|------|
| **MCP（stdio）** | Cursor、Claude Desktop、Trae 等 IDE | `python -m app.agents.mcp_server` |
| **HTTP evaluate** | Claude API、OpenAI Codex、自研远程 Agent | `POST /api/shield/evaluate` |
| **Python embed** | LangChain、同进程 Python Agent | `from app.integration import evaluate` |

线上「快速集成 → 在线试集成」与上述 API **使用同一套策略引擎**。

---

## 二、平台对照表

| 平台 | 典型形态 | 推荐接法 | 说明 |
|------|----------|----------|------|
| **Cursor** | IDE + MCP 工具 | MCP Server | 配置 `mcp.json` 挂载 AgentShield |
| **Claude Desktop** | 桌面客户端 + MCP | MCP Server | `claude_desktop_config.json` |
| **Trae** | 字节 IDE + MCP | MCP Server | 与 Cursor 类似配置 stdio |
| **Claude API** | 自写 Agent 服务 | HTTP 或 embed | 在 `tool_use` 循环里调 evaluate |
| **OpenAI Codex / GPT** | Tool calling API | HTTP 或 embed | 在 `tool_calls` 循环里调 evaluate |
| **LangChain** | Python Agent | embed + langchain_tools | 仓库内置示例 |

---

## 三、MCP 集成（Cursor / Claude Desktop / Trae）

### 3.1 前置条件

```bash
git clone https://github.com/huang08666/agentShield.git
cd agentShield/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

确认 MCP 可启动：

```bash
cd backend
PYTHONPATH=. python -m app.agents.mcp_server
# 正常则等待 stdio 输入（Ctrl+C 退出）
```

### 3.2 Cursor 配置

编辑 `~/.cursor/mcp.json`（Windows：`%USERPROFILE%\.cursor\mcp.json`）：

```json
{
  "mcpServers": {
    "agentshield": {
      "command": "/path/to/agentShield/backend/.venv/bin/python",
      "args": ["-m", "app.agents.mcp_server"],
      "cwd": "/path/to/agentShield/backend",
      "env": {
        "PYTHONPATH": "/path/to/agentShield/backend"
      }
    }
  }
}
```

将 `/path/to/agentShield` 换成本机 clone 路径。重启 Cursor 后，Agent 可调用受保护的 `read_file`、`send_email`、`query_db` 等工具，**每次调用自动过 AgentShield 网关并写审计**。

### 3.3 Claude Desktop 配置

macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`  
Windows：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentshield": {
      "command": "/path/to/agentShield/backend/.venv/bin/python",
      "args": ["-m", "app.agents.mcp_server"],
      "cwd": "/path/to/agentShield/backend",
      "env": {
        "PYTHONPATH": "/path/to/agentShield/backend"
      }
    }
  }
}
```

### 3.4 Trae

Trae 支持 MCP stdio，配置项与 Cursor 相同：指定 `python -m app.agents.mcp_server` 及 `backend` 目录为 `cwd`。

### 3.5 MCP 模式说明

- **已提供**：AgentShield 内置受保护工具（读文件、发邮件、查库、Shell、浏览器 mock）
- **若需保护其他 MCP 工具**（如 filesystem、github）：需在你自己的 MCP Server 每个 tool handler 内调用 `evaluate`，或使用 HTTP 网关（见第四节）

---

## 四、HTTP 集成（Claude API / OpenAI Codex / 自研 Agent）

适合 **你自己控制 Agent 主循环** 的场景：收到 LLM 的 `tool_use` / `tool_calls` 后，先 evaluate，再决定是否执行。

### 4.1 获取 Token

```bash
ORIGIN=http://114.215.209.144:8088

TOKEN=$(curl -s -X POST "$ORIGIN/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"student01","password":"student123"}' | jq -r .access_token)
```

### 4.2 每次工具调用前评估

```bash
curl -s -X POST "$ORIGIN/api/shield/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "user_role": "student",
    "tool_name": "read_file",
    "tool_args": {"path": "sandbox/secret.txt"},
    "user_input": "读取密钥文件",
    "framework": "claude"
  }'
```

返回 `execute_allowed: true` 时，由你的代码执行真实工具；`block` 时将 `message` 返回给 LLM。

### 4.3 Python Agent 循环示例（Claude / OpenAI 通用）

```python
from app.integration.sdk import ShieldClient

shield = ShieldClient("http://114.215.209.144:8088", token=TOKEN)

# LLM 返回 tool_call 之后：
res = shield.evaluate(
    user_role="student",
    tool_name=tool_call.name,
    tool_args=tool_call.arguments,
    user_input=user_message,
    framework="claude",  # 或 openai / cursor
)
if shield.should_execute(res):
    result = run_real_tool(tool_call.name, tool_call.arguments)
else:
    result = res["message"]  # 阻断原因，可喂回 LLM
```

### 4.4 OpenAI Codex / GPT tool_calls 伪代码

```python
response = openai.chat.completions.create(..., tools=tools)
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
    results.append({"tool_call_id": tool_call.id, "output": output})
```

---

## 五、Python 嵌入（LangChain / 同进程 Agent）

```python
from app.integration import configure, evaluate

configure(profile="campus")  # 或 policy_file="./config/my_policy.yaml"

r = evaluate(
    user_role="student",
    tool_name="read_file",
    tool_args={"path": "secret.txt"},
    user_input="请读密钥",
)
if r["execute_allowed"]:
    do_read_file(...)
```

LangChain 可直接使用 `app.agents.langchain_tools.build_langchain_tools()`，工具内部已走 `execute_via_shield`。

装饰器模式：

```python
from app.integration import configure, guard_tool, set_shield_context

configure(policy_file="./my_policy.yaml")
set_shield_context(user_role="student", user_id="u1")

@guard_tool("my_db_query")
def my_db_query(sql: str):
    return real_db.execute(sql)
```

---

## 六、落地时要定的两件事

### 6.1 工具名映射

策略 YAML 中 `role_permissions` 的 key 必须与 Agent 实际调用的 **tool_name** 一致：

| Agent 侧工具名 | 策略中配置 |
|----------------|------------|
| MCP `read_file` | `read_file` |
| 你的业务 `send_wechat` | `send_wechat`（在 my_policy.yaml 中定义） |

### 6.2 用户角色 user_role

与策略里身份对应（如 `student` / `teacher` / `operator`），可由：

- JWT 登录用户角色（HTTP 模式）
- `set_shield_context(user_role=...)`（嵌入模式）
- MCP 演示环境由 `AgentRunContext` 初始化

---

## 七、与「快速集成」页的关系

| 入口 | 作用 |
|------|------|
| **在线试集成** | 零配置模拟 evaluate，评委体验用 |
| **MCP** | Cursor / Claude / Trae 直接挂受保护工具 |
| **HTTP evaluate** | Claude API、Codex、任意语言远程 Agent |
| **embed** | Python 同进程、LangChain |

线上页面 **不会自动接管** Cursor 里已安装的其他 MCP 插件；要在 IDE 里生效，需按第三节配置 AgentShield MCP，或在自研 Agent 中加 evaluate 钩子。

---

## 八、参考链接

- 通用集成：[INTEGRATION.md](./INTEGRATION.md)
- 源码：<https://github.com/huang08666/agentShield>
- 线上演示：<http://114.215.209.144:8088>
- MCP 实现：`backend/app/agents/mcp_server.py`
- LangChain 工具：`backend/app/agents/langchain_tools.py`
