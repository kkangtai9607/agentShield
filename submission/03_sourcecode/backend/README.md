# AgentShield Backend

FastAPI 后端服务。

## 启动

```bash
uv venv .venv
source .venv/bin/activate
uv pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
uvicorn app.main:app --reload --port 8000
```

## API 端点

- `GET /health` — 健康检查
- `POST /api/chat` — Agent 对话
- `POST /api/agents/langchain/run` — LangChain 接入演示
- `POST /api/agents/mcp/run` — MCP 接入演示
- `GET /api/agents/frameworks` — 已接入框架列表
- `GET /api/audit` — 审计日志列表
- `GET /api/audit/{id}` — 审计详情
- `GET /api/policies` — 当前策略
- `PUT /api/policies` — 在线保存策略
- `POST /api/policies/reload` — 重新加载策略
- `GET /api/scenarios` — 场景列表
- `POST /api/scenarios/{id}/run` — 运行演示场景

## 场景 ID

- `malicious_doc`
- `web_pollution`
- `db_overreach`
- `dangerous_shell`
