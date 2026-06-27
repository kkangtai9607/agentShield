import { useEffect, useState } from 'react'
import { Alert, Card, Collapse, Table, Tabs, Typography, message } from 'antd'
import { api } from '../api/client'
import IntegrationPlayground from '../components/IntegrationPlayground'
import { GITHUB_REPO_URL, LIVE_SITE_URL } from '../config/site'
import {
  AGENT_LOOP_PYTHON,
  AGENT_PLATFORM_ROWS,
  INTEGRATION_PRINCIPLE,
  MCP_CLAUDE_CONFIG,
  MCP_CURSOR_CONFIG,
  MCP_SETUP_STEPS,
  OPENAI_TOOL_LOOP,
} from '../data/agentIntegrationExamples'

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
    "user_input": "用户原始输入",
    "framework": "claude"
  }'`

const codeBlock = (text: string) => (
  <pre style={{ background: '#f8fafc', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
    {text}
  </pre>
)

export default function IntegrationGuide() {
  const [policyTemplate, setPolicyTemplate] = useState('')

  useEffect(() => {
    api.integrationPolicyTemplate().then((res) => setPolicyTemplate(res.data.content)).catch(() => {})
  }, [])

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success('已复制'))
  }

  const CopyLink = ({ text }: { text: string }) => (
    <a onClick={() => copy(text)} style={{ marginTop: 8, display: 'inline-block' }}>
      复制
    </a>
  )

  return (
    <div>
      <Typography.Title level={3}>快速集成</Typography.Title>
      <Typography.Paragraph type="secondary">
        AgentShield 是夹在「你的 Agent」与「你的工具」之间的安全模块。
        <strong> 不必为了集成而单独部署网关</strong> —— 评委可直接访问线上站点体验；
        开发者从 <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub 开源仓库</a> clone 后 3 行 Python 嵌入即可。
        支持 <strong>Cursor、Claude、Trae、Codex（OpenAI）</strong> 等主流 Agent 的 MCP / Tool Calling 接入。
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
            {' · '}
            主流 Agent 文档：仓库内 <code>INTEGRATION-AGENTS.md</code>
          </span>
        }
      />

      <IntegrationPlayground />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="四种使用方式，按场景选择"
        description={
          <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li><strong>在线体验</strong>：本页下方表单，或分享 <a href={LIVE_SITE_URL} target="_blank" rel="noreferrer">{LIVE_SITE_URL}</a>（评委推荐）</li>
            <li><strong>主流 Agent（MCP）</strong>：Cursor / Claude Desktop / Trae 配置 MCP Server（见「主流 Agent」页签）</li>
            <li><strong>嵌入模式</strong>：<a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">git clone</a> → <code>from app.integration import evaluate</code></li>
            <li><strong>HTTP 网关</strong>：Claude API / Codex 在 tool 循环里调 <code>POST {LIVE_SITE_URL}/api/shield/evaluate</code></li>
          </ol>
        }
      />

      <Tabs
        defaultActiveKey="agents"
        items={[
          {
            key: 'agents',
            label: '主流 Agent（Cursor / Claude / Trae / Codex）',
            children: (
              <Card>
                <Typography.Paragraph>
                  在 LLM 产出 <code>tool_call</code> 之后、真实工具执行之前，调用 AgentShield 做安全检查。
                  IDE 类 Agent 推荐 <strong>MCP</strong>；自研服务推荐 <strong>HTTP evaluate</strong> 或 Python embed。
                </Typography.Paragraph>

                {codeBlock(INTEGRATION_PRINCIPLE)}
                <CopyLink text={INTEGRATION_PRINCIPLE} />

                <Typography.Title level={5} style={{ marginTop: 24 }}>
                  平台对照
                </Typography.Title>
                <Table
                  size="small"
                  pagination={false}
                  rowKey="platform"
                  dataSource={[...AGENT_PLATFORM_ROWS]}
                  columns={[
                    { title: '平台', dataIndex: 'platform', width: 140 },
                    { title: '形态', dataIndex: 'form', width: 140 },
                    { title: '推荐接法', dataIndex: 'method', width: 120 },
                    { title: '说明', dataIndex: 'note' },
                  ]}
                  style={{ marginBottom: 24 }}
                />

                <Collapse
                  defaultActiveKey={['mcp-cursor']}
                  items={[
                    {
                      key: 'mcp-setup',
                      label: 'MCP 安装步骤（Cursor / Claude / Trae 通用）',
                      children: (
                        <>
                          {codeBlock(MCP_SETUP_STEPS)}
                          <CopyLink text={MCP_SETUP_STEPS} />
                        </>
                      ),
                    },
                    {
                      key: 'mcp-cursor',
                      label: 'Cursor — ~/.cursor/mcp.json',
                      children: (
                        <>
                          <Typography.Paragraph type="secondary">
                            将 <code>/path/to/agentShield/backend</code> 换成本机 clone 路径，重启 Cursor。
                          </Typography.Paragraph>
                          {codeBlock(MCP_CURSOR_CONFIG)}
                          <CopyLink text={MCP_CURSOR_CONFIG} />
                        </>
                      ),
                    },
                    {
                      key: 'mcp-claude',
                      label: 'Claude Desktop — claude_desktop_config.json',
                      children: (
                        <>
                          <Typography.Paragraph type="secondary">
                            macOS：
                            <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                          </Typography.Paragraph>
                          {codeBlock(MCP_CLAUDE_CONFIG)}
                          <CopyLink text={MCP_CLAUDE_CONFIG} />
                        </>
                      ),
                    },
                    {
                      key: 'http-loop',
                      label: 'Claude API / 自研 Agent — HTTP evaluate 循环',
                      children: (
                        <>
                          {codeBlock(AGENT_LOOP_PYTHON)}
                          <CopyLink text={AGENT_LOOP_PYTHON} />
                        </>
                      ),
                    },
                    {
                      key: 'openai-loop',
                      label: 'OpenAI Codex / GPT — tool_calls 循环',
                      children: (
                        <>
                          {codeBlock(OPENAI_TOOL_LOOP)}
                          <CopyLink text={OPENAI_TOOL_LOOP} />
                        </>
                      ),
                    },
                  ]}
                />

                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                  message="说明"
                  description={
                    <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                      <li>MCP 模式提供 AgentShield 内置受保护工具；要保护其他 MCP 插件需在各自 handler 内调 evaluate</li>
                      <li>策略 YAML 中 tool_name 须与 Agent 实际调用名一致</li>
                      <li>完整文档见仓库 <code>INTEGRATION-AGENTS.md</code></li>
                    </ul>
                  }
                />
              </Card>
            ),
          },
          {
            key: 'embed',
            label: '嵌入模式（推荐）',
            children: (
              <Card>
                <Typography.Paragraph>
                  把 AgentShield 当作 Python 安全库 import，与 FastAPI 服务无关。策略写在 YAML，换业务只换配置。
                </Typography.Paragraph>
                {codeBlock(EMBED_EXAMPLE)}
                <CopyLink text={EMBED_EXAMPLE} />
              </Card>
            ),
          },
          {
            key: 'cli',
            label: 'CLI 一键',
            children: (
              <Card>
                {codeBlock(CLI_EXAMPLE)}
                <CopyLink text={CLI_EXAMPLE} />
              </Card>
            ),
          },
          {
            key: 'decorator',
            label: '装饰器',
            children: (
              <Card>
                {codeBlock(DECORATOR_EXAMPLE)}
                <CopyLink text={DECORATOR_EXAMPLE} />
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
                  message="Claude API / Codex / 远程 Agent 在工具循环中调用"
                  description={`线上实例：${LIVE_SITE_URL}；field framework 可填 claude / openai / cursor`}
                />
                {codeBlock(HTTP_EXAMPLE)}
                <CopyLink text={HTTP_EXAMPLE} />
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
            key: 'doc-agents',
            label: '完整文档 INTEGRATION-AGENTS.md（主流 Agent）',
            children: (
              <Typography.Paragraph>
                仓库内 <code>INTEGRATION-AGENTS.md</code> 含 Cursor / Claude / Trae / Codex 详细配置；
                通用说明见 <code>INTEGRATION.md</code>。开源地址{' '}
                <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">{GITHUB_REPO_URL}</a>
              </Typography.Paragraph>
            ),
          },
        ]}
      />
    </div>
  )
}
