# AgentShield 即插即用集成指南

> **在线演示**：<http://114.215.209.144:8088>（登录后打开「快速集成 → 在线试集成」）  
> **开源仓库**：<https://github.com/huang08666/agentShield>  
> **普通用户 / 评委**：浏览器打开线上地址即可体验，无需本地部署。  
> **开发者**：`git clone` 后 `from app.integration import evaluate`，3 行嵌入，无需 uvicorn。

## 三种方式怎么选？

| 方式 | 是否需要部署 | 适合谁 | 入口 |
|------|-------------|--------|------|
| **在线体验** | 否 | 评委、产品体验 | <http://114.215.209.144:8088/integration-guide> |
| **嵌入模式** | 否（import 即用） | Python Agent 开发者 | `git clone` → `from app.integration import evaluate` |
| **HTTP 网关** | 可选（已提供线上实例） | 多语言 / 远程 Agent | `POST http://114.215.209.144:8088/api/shield/evaluate` |

---

## 方式一：在线体验（0 配置）

1. 浏览器打开 **http://114.215.209.144:8088**
2. 使用演示账号登录（校园场景：`student01` / `student123`）
3. 侧栏进入 **快速集成**，在「在线试集成」中选择角色、工具、参数，点击 **立即评估**
4. 查看 `execute_allowed` 与决策原因 —— 与正式集成 API 完全一致

**无需 curl，无需本地启动服务。**

---

## 方式二：嵌入模式（推荐开发者）

### 30 秒跑通

```bash
git clone https://github.com/huang08666/agentShield.git
cd agentShield/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python ../examples/minimal_embed.py
```

### 集成到你的 Agent（3 行）

```python
from app.integration import configure, evaluate

configure(profile="campus")  # 或 policy_file="./my_policy.yaml"

r = evaluate(
    user_role="operator",
    tool_name="send_email",
    tool_args={"to": "a@b.com", "subject": "hi", "body": "x"},
    user_input="发邮件",
)
if r["execute_allowed"]:
    your_real_send_email(...)  # 只有允许时才执行真实工具
```

### CLI 一键

```bash
cd agentShield/backend

PYTHONPATH=. python -m app.integration.cli check \
  --role student --tool read_file --args '{"path":"secret.txt"}'

PYTHONPATH=. python -m app.integration.cli init ./my_project

PYTHONPATH=. python -m app.integration.cli demo
```

### 装饰器（自动拦截）

```python
from app.integration import configure, guard_tool, set_shield_context

configure(policy_file="./my_policy.yaml")
set_shield_context(user_role="operator", user_id="u1")

@guard_tool("my_search")
def my_search(query: str) -> str:
    return call_your_api(query)
```

**说明**：嵌入模式在进程内调用同一套 `PolicyEngine` + `Gateway`，会写本地 SQLite 审计；**不需要**启动 FastAPI。

---

## 方式三：HTTP 网关（可选）

线上已部署实例：

```
POST http://114.215.209.144:8088/api/shield/evaluate
```

```bash
ORIGIN=http://114.215.209.144:8088

TOKEN=$(curl -s -X POST "$ORIGIN/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"student01","password":"student123"}' | jq -r .access_token)

curl -s -X POST "$ORIGIN/api/shield/evaluate" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "user_role": "operator",
    "tool_name": "send_email",
    "tool_args": {"to":"a@b.com","subject":"hi","body":"x"},
    "user_input": "发邮件"
  }'
```

健康检查：`GET http://114.215.209.144:8088/health`

Python HTTP SDK：

```python
from app.integration.sdk import ShieldClient

client = ShieldClient("http://114.215.209.144:8088", token="...")
res = client.evaluate(user_role="operator", tool_name="query_db", tool_args={"sql": "..."})
if client.should_execute(res):
    run_your_real_tool()
```

---

## 策略配置

```bash
cp config/user_policy.template.yaml config/my_policy.yaml
```

嵌入：`configure(policy_file="./config/my_policy.yaml")`  
HTTP 部署：`.env` 中 `POLICY_FILE=./config/my_policy.yaml`

---

## 与演示场景包的关系

- `profiles/campus|personal|enterprise`：竞赛演示切换
- `POLICY_FILE` / 嵌入 `configure(policy_file=...)`：真实用户即插即用

答辩话术：**线上 http://114.215.209.144:8088 零配置体验；开发者 git clone 嵌入；团队落地用 POLICY_FILE 或 HTTP evaluate。**

---

## LangChain / MCP / 主流 Agent

- **Cursor / Claude Desktop / Trae**：MCP stdio → `python -m app.agents.mcp_server`（详见 [INTEGRATION-AGENTS.md](./INTEGRATION-AGENTS.md)）
- **Claude API / OpenAI Codex**：在 tool 循环里调 HTTP evaluate 或 embed

---

## 源码与部署

- 源码：<https://github.com/huang08666/agentShield>
- IP 演示部署：[deploy/IP-PORT-ACCESS.md](./deploy/IP-PORT-ACCESS.md)
- 域名部署（备案后）：[deploy/DEPLOY.md](./deploy/DEPLOY.md)
- 服务器更新：`bash deploy/sync-to-server.sh root@114.215.209.144`
