# AgentShield

面向大模型智能体工具调用的**通用**安全防护网关 — 即插即用策略包，适配校园 / 个人 / 企业等多种 Agent 场景。

**在线演示**：<https://agentshieldtop.xyz>  
**开源仓库**：<https://github.com/kkangtai9607/agentShield>

## 项目简介

AgentShield 不是普通聊天机器人，也不是单纯提示词注入检测器，而是夹在 AI Agent 和外部工具之间的**安全网关**。内核与场景解耦：切换策略包即可改变角色体系与规则，无需改代码。

### 内置场景策略包（Profile）

| 场景包 | 身份示例 | 适用 |
|--------|----------|------|
| **校园演示** `campus` | 学生 / 教师 / 管理员 | 竞赛答辩、教学演示 |
| **个人助手** `personal` | 主人 / 访客 | 个人 Agent、本地助手 |
| **企业客服** `enterprise` | 一线客服 / 主管 | 企业内部 Agent、工单 |

在 **策略中心** 一键切换场景；各场景独立 YAML 保存在 `app/policies/profiles/`。

## 项目亮点

- **多场景策略包**：校园 / 个人 / 企业一键切换，即插即用
- **行为级安全**：判断「Agent 准备执行的行为是否安全」，而非仅检测用户输入
- **四层决策**：allow / mask / confirm / block
- **多维度策略**：角色权限、敏感路径、SQL/Shell 规则、提示注入、敏感信息脱敏
- **完整审计链**：每次工具调用均记录风险分、决策、原因
- **离线可演示**：无 API_KEY 时使用 mock LLM，内置 4 个攻击场景

## 系统架构

```
用户输入 → Simple Agent → LLM/mock → 工具调用计划
    → AgentShield Gateway → Policy Engine → 决策
    → 安全工具执行 → Content Guard → 审计日志 → 前端展示
```

## 快速集成（普通用户 / 评委 / 开发者）

| 你是谁 | 怎么做 | 要不要部署 |
|--------|--------|-----------|
| **评委 / 体验用户** | 打开 <https://agentshieldtop.xyz> → 登录 → **快速集成 → 在线试集成** →「立即评估」 | 否 |
| **Python 开发者** | `git clone` 本仓库 → `from app.integration import evaluate`（见 [INTEGRATION.md](./INTEGRATION.md)） | 否 |
| **团队 HTTP 接入** | `POST https://agentshieldtop.xyz/api/shield/evaluate`（或部署后使用你的同源地址） | 可选 |

详见 [INTEGRATION.md](./INTEGRATION.md)

**自行部署**见 [deploy/DEPLOY.md](./deploy/DEPLOY.md)。生产环境已上线 **agentshieldtop.xyz**（nginx + systemd，后端仅监听 127.0.0.1:8001）。

## 代码同步（GitHub）

仓库：<https://github.com/kkangtai9607/agentShield>

```bash
# 本地改完推送
git add -A && git commit -m "描述本次修改" && git push

# 云服务器 /opt/agentshield 拉取后重启（示例）
cd /opt/agentshield && git pull
sudo bash deploy/deploy.sh
```

勿提交 `backend/.env` 及含真实密钥的文件；生产环境变量仅在服务器本地配置。

```bash
# 30 秒体验嵌入模式（零 HTTP）
cd agentshield/backend && PYTHONPATH=. python ../examples/minimal_embed.py

# 一条命令检查
PYTHONPATH=. python -m app.integration.cli check --role student --tool read_file --args '{"path":"secret.txt"}'
```

## 安装步骤

### 后端

```bash
cd agentshield/backend
uv venv .venv
source .venv/bin/activate        # Linux / macOS
uv pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
cp .env.example .env
```

### 前端

```bash
cd agentshield/frontend
npm install
```

## 启动命令

### 后端

```bash
cd agentshield/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd agentshield/frontend
npm run dev
```

本机访问：http://localhost:5173

**局域网访问**（手机/其他电脑同 WiFi）：

1. 查本机 IP：`hostname -I` 或 `ip addr`（如 `192.168.1.100`）
2. 其他设备浏览器打开：`http://192.168.1.100:5173`
3. 后端需 `--host 0.0.0.0`；前端 `npm run dev` 已默认 `--host` 监听全网卡
4. 若仍无法访问，检查防火墙是否放行 5173、8000 端口

## .env 配置

| 变量 | 说明 |
|------|------|
| API_BASE | OpenAI-compatible API 地址 |
| API_KEY | API 密钥，留空则使用 mock LLM |
| MODEL_NAME | 模型名称 |
| DATABASE_URL | SQLite 数据库路径 |
| SANDBOX_DIR | 沙箱目录路径 |
| POLICY_PROFILE | 强制场景包（campus/personal/enterprise），留空读 active_profile.json |

## 场景策略包切换

策略中心页面顶部下拉切换，或 API：

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:8000/api/policies/profile/personal/activate
```

| 场景 | 演示账号 |
|------|----------|
| 校园 campus | student01 / teacher01 / admin01 |
| 个人 personal | owner01 / owner123，guest01 / guest123 |
| 企业 enterprise | agent01 / agent123，supervisor01 / supervisor123 |

## 内置攻击演示（校园场景包）

1. **恶意文档诱导泄密** — malicious_doc.txt 含提示注入，阻断 secret 读取和邮件外发
2. **恶意网页工具返回污染** — 网页内容含 ignore previous instructions
3. **数据库越权查询** — 阻断 SELECT * FROM students
4. **危险命令执行** — 阻断 rm -rf

## 安全声明

本项目仅用于防护研究和本地演示：
- 不执行真实攻击
- 不发送真实邮件（send_email 为 mock）
- 不访问真实敏感系统
- Shell 命令限制在 sandbox 目录

## 后续扩展方向

- 接入 LangChain Tool
- 接入 OpenAI Tool Calling
- 接入 MCP Gateway
- 支持企业内部知识库 Agent
- 支持更细粒度 ABAC/RBAC 权限控制
