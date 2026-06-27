import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { api } from '../api/client'
import DecisionCard from './DecisionCard'
import { useProfile } from '../context/ProfileContext'
import { getStoredUser } from '../utils/auth'

const TOOL_PRESETS = [
  { label: '读报告', tool: 'read_file', args: '{"path":"sandbox/report.txt"}' },
  { label: '读密钥', tool: 'read_file', args: '{"path":"sandbox/secret.txt"}' },
  { label: '发邮件', tool: 'send_email', args: '{"to":"test@example.com","subject":"hi","body":"hello"}' },
  { label: '越权查询', tool: 'query_db', args: '{"sql":"SELECT * FROM students"}' },
  { label: '危险命令', tool: 'run_shell', args: '{"command":"rm -rf sandbox/*"}' },
]

export default function IntegrationPlayground() {
  const authUser = getStoredUser()
  const { formatRole, roleLabels } = useProfile()
  const roles = Object.keys(roleLabels)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [form] = Form.useForm()

  const run = async () => {
    const values = form.getFieldsValue()
    let toolArgs: Record<string, unknown> = {}
    try {
      toolArgs = JSON.parse(values.tool_args || '{}')
    } catch {
      message.error('tool_args 必须是合法 JSON')
      return
    }
    setLoading(true)
    try {
      const res = await api.shieldEvaluate({
        user_role: values.user_role,
        tool_name: values.tool_name,
        tool_args: toolArgs,
        user_input: values.user_input || '',
      })
      setResult(res.data as unknown as Record<string, unknown>)
      message.success('评估完成')
    } catch {
      message.error('评估失败，请确认已登录且后端在线')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://你的域名'
  const embedSnippet = `from app.integration import configure, evaluate

configure(profile="campus")  # 或 policy_file="./my_policy.yaml"
r = evaluate(user_role="${form.getFieldValue('user_role') || 'student'}", tool_name="${form.getFieldValue('tool_name') || 'read_file'}", tool_args=${form.getFieldValue('tool_args') || '{}'})
if r["execute_allowed"]:
    your_real_tool()` 

  const httpSnippet = `# 当前站点同源调用（评委打开控制台即可试，无需记 127.0.0.1:8000）
curl -X POST ${origin}/api/shield/evaluate \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_role": "${form.getFieldValue('user_role') || 'student'}",
    "tool_name": "${form.getFieldValue('tool_name') || 'read_file'}",
    "tool_args": ${form.getFieldValue('tool_args') || '{}'},
    "user_input": "用户输入"
  }'`

  return (
    <Card title="在线试集成（零配置）" style={{ marginBottom: 16, borderColor: '#b7eb8f' }}>
      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
        message="评委 / 普通用户：无需 curl、无需单独部署网关"
        description={
          <span>
            您已登录为 <Tag>{authUser?.name}</Tag>，下方直接模拟「Agent 准备调用工具前」的安全检查。
            这与 Benchmark 现场评估、Agent 对话使用<strong>同一套策略引擎</strong>。
          </span>
        }
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          user_role: authUser?.user_role || 'student',
          tool_name: 'read_file',
          tool_args: '{"path":"sandbox/report.txt"}',
          user_input: '请读取报告',
        }}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary">快捷预设：</Typography.Text>
          {TOOL_PRESETS.map((p) => (
            <Button
              key={p.label}
              size="small"
              onClick={() => {
                form.setFieldsValue({
                  tool_name: p.tool,
                  tool_args: p.args,
                  user_input: p.label,
                })
              }}
            >
              {p.label}
            </Button>
          ))}
        </Space>

        <Form.Item name="user_role" label="用户角色" rules={[{ required: true }]}>
          <Select
            options={roles.map((r) => ({ value: r, label: formatRole(r) }))}
            style={{ maxWidth: 280 }}
          />
        </Form.Item>
        <Form.Item name="tool_name" label="工具名" rules={[{ required: true }]}>
          <Input placeholder="任意工具名，与 policy 中 role_permissions 对应" />
        </Form.Item>
        <Form.Item name="tool_args" label="工具参数 (JSON)" rules={[{ required: true }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="user_input" label="用户原始输入">
          <Input />
        </Form.Item>
        <Button type="primary" loading={loading} onClick={run}>
          立即评估（等同集成 evaluate）
        </Button>
      </Form>

      {result && (
        <div style={{ marginTop: 16 }}>
          <Space wrap style={{ marginBottom: 8 }}>
            <Tag color={result.execute_allowed ? 'success' : 'error'}>
              execute_allowed: {String(result.execute_allowed)}
            </Tag>
            <Tag>{String((result.decision as Record<string, unknown>)?.decision ?? '')}</Tag>
          </Space>
          <Typography.Paragraph type="secondary">{String(result.message ?? '')}</Typography.Paragraph>
          {(result.decision as Record<string, unknown>) && (
            <DecisionCard decision={result.decision as never} />
          )}
        </div>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        根据本次参数生成的集成代码
      </Typography.Title>
      <Typography.Text type="secondary">方式 A — 嵌入模式（推荐，无需 HTTP 服务）</Typography.Text>
      <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
        {embedSnippet}
      </pre>
      <Typography.Text type="secondary">方式 B — 已打开本控制台时的 HTTP（同源，非 localhost 硬编码）</Typography.Text>
      <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
        {httpSnippet}
      </pre>
    </Card>
  )
}
