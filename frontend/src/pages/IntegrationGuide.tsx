import { useEffect, useState } from 'react'
import { Alert, Card, Collapse, Tabs, Typography, message } from 'antd'
import { api } from '../api/client'
import IntegrationPlayground from '../components/IntegrationPlayground'
import { GITHUB_REPO_URL, LIVE_SITE_URL } from '../config/site'

const EMBED_EXAMPLE = `# 开源仓库
git clone ${GITHUB_REPO_URL}.git
cd agentShield/backend
pip install -r requirements.txt
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

const HTTP_EXAMPLE = `# 线上实例（已部署）
ORIGIN=${LIVE_SITE_URL}

# 或团队自建控制台时使用当前浏览器同源地址
TOKEN="登录后从 /api/auth/login 获取"

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
        <strong> 不必为了集成而单独部署网关</strong> —— 评委可直接访问线上站点体验；
        开发者从 <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub 开源仓库</a> clone 后 3 行 Python 嵌入即可。
      </Typography.Paragraph>

      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
        message="已上线开源"
        description={
          <span>
            在线演示：<a href={LIVE_SITE_URL} target="_blank" rel="noreferrer">{LIVE_SITE_URL}</a>
            {' · '}
            源码：<a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">{GITHUB_REPO_URL}</a>
          </span>
        }
      />

      <IntegrationPlayground />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="三种使用方式，按场景选择"
        description={
          <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>在线体验</strong>：本页下方表单，或分享 <a href={LIVE_SITE_URL} target="_blank" rel="noreferrer">{LIVE_SITE_URL}</a>（评委推荐）</li>
            <li><strong>嵌入模式</strong>：<a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">git clone</a> → <code>from app.integration import evaluate</code>，进程内调用，零 HTTP</li>
            <li><strong>HTTP 网关</strong>（可选）：<code>POST {LIVE_SITE_URL}/api/shield/evaluate</code> 或自建同源地址</li>
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
                  description="若您已在浏览器打开 AgentShield，请优先用上方「在线试集成」或嵌入模式。线上实例：agentshieldtop.xyz"
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
                仓库内 <code>INTEGRATION.md</code> 含完整接入说明；开源地址{' '}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">{GITHUB_REPO_URL}</a>
              </Typography.Paragraph>
            ),
          },
        ]}
      />
    </div>
  )
}
