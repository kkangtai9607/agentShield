# AgentShield 即插即用集成指南

> **普通用户 / 评委**：不必先部署网关。打开控制台「快速集成 → 在线试集成」即可体验。  
> **开发者**：git clone 后 `from app.integration import evaluate`，3 行嵌入，无需 uvicorn。  
> **团队**：可选部署控制台，Agent 调同源 `/api/shield/evaluate`。

## 三种方式怎么选？

| 方式 | 是否需要部署 | 适合谁 | 入口 |
|------|-------------|--------|------|
| **在线体验** | 否（打开演示站点即可） | 评委、产品体验 | 控制台 → 快速集成 → 在线试集成 |
| **嵌入模式** | 否（import 即用） | Python Agent 开发者 | `from app.integration import evaluate` |
| **HTTP 网关** | 是（可选） | 多语言 / 远程 Agent | `POST /api/shield/evaluate`（同源） |

---

## 方式一：在线体验（0 配置）

1. 启动演示站点（或访问主办方部署的地址）
2. 登录演示账号
3. 打开 **快速集成** 页，在「在线试集成」表单中选择角色、工具、参数，点击 **立即评估**
4. 查看 `execute_allowed` 与决策原因 —— 与正式集成 API 完全一致

**无需 curl，无需记住 127.0.0.1:8000。**

---

## 方式二：嵌入模式（推荐开发者）

### 30 秒跑通

```bash
git clone <your-repo>
cd agentshield/backend
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
cd agentshield/backend

# 检查一次调用
PYTHONPATH=. python -m app.integration.cli check \
  --role student --tool read_file --args '{"path":"secret.txt"}'

# 生成 my_policy.yaml + 示例脚本
PYTHONPATH=. python -m app.integration.cli init ./my_project

# 内置演示
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

仅当 Agent 与 AgentShield **分离部署**（不同进程/语言）时使用。

若您通过浏览器已打开 AgentShield 控制台，请使用 **当前站点同源地址**：

```
POST https://<演示域名>/api/shield/evaluate
```

**不要**硬编码 `127.0.0.1:8000` —— 前端 Vite 会把 `/api` 代理到后端，评委在局域网访问时同源即可。

```bash
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

返回 `execute_allowed: true` 时由 **你的 Agent 执行真实工具**。

Python HTTP SDK：

```python
from app.integration.sdk import ShieldClient

client = ShieldClient("https://你的域名", token="...")
res = client.evaluate(user_role="operator", tool_name="query_db", tool_args={"sql": "..."})
if client.should_execute(res):
    run_your_real_tool()
```

---

## 策略配置

```bash
cp config/user_policy.template.yaml config/my_policy.yaml
# 编辑 role_permissions：身份 × 工具 → allow / deny / confirm
```

嵌入：`configure(policy_file="./config/my_policy.yaml")`  
HTTP 部署：`.env` 中 `POLICY_FILE=./config/my_policy.yaml`

| 字段 | 作用 |
|------|------|
| `role_permissions` | 身份 × 工具 → allow / deny / confirm |
| `decision_thresholds` | 风险分 → allow/mask/confirm/block |

**工具名按你的业务自定义**，不必与 demo 工具一致。

---

## 与演示场景包的关系

- `profiles/campus|personal|enterprise`：竞赛演示切换
- `POLICY_FILE` / 嵌入 `configure(policy_file=...)`：真实用户即插即用

答辩话术：**演示用场景包 + 在线试集成；落地用嵌入模式或 POLICY_FILE，无需改网关代码。**

---

## LangChain / MCP

- LangChain：`app/agents/langchain_tools.py` → `execute_via_shield`
- MCP：`python -m app.agents.mcp_server`（stdio）

二者在演示环境中仍依赖控制台后端；**自研 Agent 优先推荐嵌入模式**。
