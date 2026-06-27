import { useEffect, useState } from 'react'
import { Alert, Card, Collapse, Tabs, Typography, message } from 'antd'
import { api } from '../api/client'
import IntegrationPlayground from '../components/IntegrationPlayground'

const EMBED_EXAMPLE = `# 零部署：git clone 后 3 行即可（无需 uvicorn / curl）
cd agentshield/backend
PYTHONPATH=. python ../examples/minimal_embed.py

# 或在您的 Agent 代码中：
from app.integration import configure, evaluate

configure(profile="campus")          # 或 policy_file="./my_policy.yaml"
r = evaluate(
    user_role="operator",
    tool_name="your_tool",
    tool_args={"key": "value"},
    user_input="用户说的话",
)
if r["execute_allowed"]:
    run_your_real_tool()             # 只有允许时才执行真实工具`

const DECORATOR_EXAMPLE = `from app.integration import configure, guard_tool, set_shield_context

configure(policy_file="./my_policy.yaml")
set_shield_context(user_role="operator", user_id="u1")

@guard_tool("your_tool")
def your_tool(**kwargs):
    return your_real_implementation(**kwargs)`

const CLI_EXAMPLE = `# 一条命令检查（无需启动 Web 服务）
cd agentshield/backend
PYTHONPATH=. python -m app.integration.cli check \\
  --role student --tool read_file --args '{"path":"secret.txt"}'

# 生成策略模板 + 示例脚本
PYTHONPATH=. python -m app.integration.cli init ./my_agent_project

# 内置演示
PYTHONPATH=. python -m app.integration.cli demo`

const HTTP_EXAMPLE = `# 可选：团队已部署 AgentShield 控制台时
# 使用当前站点同源地址（打开控制台即 /api，无需记 127.0.0.1:8000）
TOKEN="登录后从浏览器 Network 或 /api/auth/login 获取"

curl -X POST "$ORIGIN/api/shield/evaluate" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_role": "operator",
    "tool_name": "your_tool",
    "tool_args": {"key": "value"},
    "user_input": "用户原始输入"
  }'`

export default function IntegrationGuide() {
  const [policyTemplate, setPolicyTemplate] = useState('')

  useEffect(() => {
    api.integrationPolicyTemplate().then((res) => setPolicyTemplate(res.data.content)).catch(() => {})
  }, [])

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制'))
  }

  return (
    <div>
      <Typography.Title level={3}>快速集成</Typography.Title>
      <Typography.Paragraph type="secondary">
        AgentShield 是夹在「你的 Agent」与「你的工具」之间的安全模块。
        <strong> 不必为了集成而单独部署网关</strong> —— 多数场景用嵌入模式 3 行 Python 即可；
        评委可在下方「在线试集成」零配置体验；团队落地时再选 HTTP 网关。
      </Typography.Paragraph>

      <IntegrationPlayground />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="三种使用方式，按场景选择"
        description={
          <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>在线体验</strong>：打开本页下方表单，登录即用（评委推荐）</li>
            <li><strong>嵌入模式</strong>：git clone → <code>from app.integration import evaluate</code>，进程内调用，零 HTTP</li>
            <li><strong>HTTP 网关</strong>（可选）：团队统一部署控制台后，Agent 调同源 <code>/api/shield/evaluate</code></li>
          </ol>
        }
      />

      <Tabs
        defaultActiveKey="embed"
        items={[
          {
            key: 'embed',
            label: '嵌入模式（推荐）',
            children: (
              <Card>
                <Typography.Paragraph>
                  把 AgentShield 当作 Python 安全库 import，与 FastAPI 服务无关。策略写在 YAML，换业务只换配置。
                </Typography.Paragraph>
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                  {EMBED_EXAMPLE}
                </pre>
                <a onClick={() => copy(EMBED_EXAMPLE)}>复制</a>
              </Card>
            ),
          },
          {
            key: 'cli',
            label: 'CLI 一键',
            children: (
              <Card>
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                  {CLI_EXAMPLE}
                </pre>
                <a onClick={() => copy(CLI_EXAMPLE)}>复制</a>
              </Card>
            ),
          },
          {
            key: 'decorator',
            label: '装饰器',
            children: (
              <Card>
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                  {DECORATOR_EXAMPLE}
                </pre>
                <a onClick={() => copy(DECORATOR_EXAMPLE)}>复制</a>
              </Card>
            ),
          },
          {
            key: 'http',
            label: 'HTTP（可选）',
            children: (
              <Card>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="仅当 Agent 与控制台分离部署时需要"
                  description="若您已在浏览器打开 AgentShield，请优先用上方「在线试集成」或嵌入模式，不要手写 localhost:8000。"
                />
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                  {HTTP_EXAMPLE}
                </pre>
                <a onClick={() => copy(HTTP_EXAMPLE)}>复制</a>
              </Card>
            ),
          },
          {
            key: 'policy',
            label: '策略模板 YAML',
            children: (
              <Card>
                <Typography.Paragraph type="secondary">
                  复制为 my_policy.yaml，工具名和身份名按你的业务自定义。嵌入模式：<code>configure(policy_file=...)</code>
                </Typography.Paragraph>
                <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, maxHeight: 480, overflow: 'auto', fontSize: 12 }}>
                  {policyTemplate || '加载中…'}
                </pre>
              </Card>
            ),
          },
        ]}
      />

      <Collapse
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'doc',
            label: '完整文档 INTEGRATION.md',
            children: (
              <Typography.Paragraph>
                仓库内 <code>agentshield/INTEGRATION.md</code> 含架构说明与答辩话术。
              </Typography.Paragraph>
            ),
          },
        ]}
      />
    </div>
  )
}
