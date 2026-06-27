import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import axios from 'axios'
import { api, getPolicies, type AgentIntegrationResponse, type AgentFrameworkInfo } from '../api/client'
import DecisionCard from '../components/DecisionCard'
import RolePermissionCard from '../components/RolePermissionCard'
import { useProfile } from '../context/ProfileContext'
import { getStoredUser } from '../utils/auth'
import { useManualConfirm } from '../hooks/useManualConfirm'
import { getDecisionKey } from '../utils/chat'
import { getIntegrationExamplesForProfile } from '../data/profileExamples'

const FRAMEWORK_COLORS: Record<string, string> = {
  langchain: 'green',
  mcp: 'purple',
}

function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (e.code === 'ERR_NETWORK') return '无法连接后端，请先启动后端服务'
    return e.message
  }
  return '请求失败'
}

export default function AgentIntegrations() {
  const authUser = getStoredUser()
  const { formatRole, profileName, activeProfile, roleLabels } = useProfile()
  const userRole = authUser?.user_role ?? 'student'
  const roleValidInProfile = userRole in roleLabels
  const examples = getIntegrationExamplesForProfile(activeProfile)
  const { manualConfirmState, clearManualConfirm, handleConfirmAction } = useManualConfirm()
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, string>>>({})
  const [frameworks, setFrameworks] = useState<AgentFrameworkInfo[]>([])
  const [framework, setFramework] = useState('langchain')
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AgentIntegrationResponse | null>(null)

  useEffect(() => {
    api.agentFrameworks().then((res) => setFrameworks(res.data))
    getPolicies().then((p) => setRolePermissions((p.role_permissions as Record<string, Record<string, string>>) ?? {}))
  }, [profileName])

  const run = async () => {
    if (!messageText.trim()) return
    setLoading(true)
    setError(null)
    clearManualConfirm()
    try {
      const payload = { message: messageText.trim() }
      const res =
        framework === 'mcp'
          ? await api.runMcpAgent(payload)
          : await api.runLangchainAgent(payload)
      setResult(res.data)
    } catch (e) {
      setError(extractError(e))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const currentFw = frameworks.find((f) => f.id === framework)

  return (
    <div>
      <Typography.Title level={3}>主流框架接入演示</Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="本页为 LangChain / MCP 内置演示"
        description={
          <span>
            若要将 AgentShield 即插即用接入你自己的 Agent，请打开侧栏「快速集成」。
            当前身份：<Tag>{formatRole(userRole)}</Tag> 场景 <Tag color="purple">{profileName}</Tag>
          </span>
        }
      />

      {!roleValidInProfile && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前身份「${formatRole(userRole)}」不属于「${profileName}」场景`}
          description="请使用本场景演示账号登录后再测试人工确认类示例。"
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {frameworks.map((fw) => (
          <Col xs={24} md={12} key={fw.id}>
            <Card
              size="small"
              title={
                <Space>
                  <Tag color={FRAMEWORK_COLORS[fw.id]}>{fw.name}</Tag>
                </Space>
              }
              style={{
                borderColor: framework === fw.id ? '#1677ff' : undefined,
                boxShadow: framework === fw.id ? '0 0 0 2px rgba(22,119,255,0.15)' : undefined,
              }}
              extra={
                <Button
                  size="small"
                  type={framework === fw.id ? 'primary' : 'default'}
                  onClick={() => setFramework(fw.id)}
                >
                  选择
                </Button>
              }
            >
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {fw.description}
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 12 }}>
          <span>当前框架:</span>
          <Tag color={FRAMEWORK_COLORS[framework]}>{currentFw?.name || framework}</Tag>
        </Space>
        <RolePermissionCard role={userRole} rolePermissions={rolePermissions} />
        <div style={{ margin: '12px 0' }}>
          <Typography.Text type="secondary">快捷示例（{profileName}）：</Typography.Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {examples.map((ex) => (
              <Button
                key={ex.label}
                size="small"
                type={ex.framework === framework ? 'primary' : 'default'}
                danger={ex.kind === 'attack'}
                ghost={ex.kind === 'confirm'}
                onClick={() => {
                  if (ex.role !== userRole) {
                    message.warning(`该示例建议以「${formatRole(ex.role)}」身份登录`)
                  }
                  setFramework(ex.framework)
                  setMessageText(ex.message)
                }}
              >
                {ex.label}
              </Button>
            ))}
          </div>
        </div>
        <Input.TextArea
          rows={3}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="输入测试请求，将通过所选 Agent 框架调用工具..."
          style={{ marginBottom: 12 }}
        />
        <Button type="primary" loading={loading} onClick={run}>
          运行 {framework === 'mcp' ? 'MCP' : 'LangChain'} 演示
        </Button>
      </Card>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      {result && (
        <Card title="执行结果">
          <Space wrap style={{ marginBottom: 12 }}>
            <Tag color={FRAMEWORK_COLORS[result.framework]}>{result.framework.toUpperCase()}</Tag>
            <Tag>{result.mode}</Tag>
            <Tag>Session: {result.session_id.slice(0, 8)}...</Tag>
          </Space>
          <Typography.Paragraph>
            <Typography.Text strong>Agent 计划: </Typography.Text>
            {result.agent_plan || '—'}
          </Typography.Paragraph>
          {result.planned_tool_calls?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Typography.Text strong>计划工具调用:</Typography.Text>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {result.planned_tool_calls.map((tc, i) => (
                  <li key={i}>
                    <code>{tc.tool_name}</code> {JSON.stringify(tc.tool_args)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Typography.Paragraph>
            <Typography.Text strong>最终回答:</Typography.Text>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 8 }}>
              {result.answer}
            </pre>
          </Typography.Paragraph>
          <Typography.Title level={5}>AgentShield 决策链</Typography.Title>
          {result.shield_decisions?.map((d, i) => {
            const key = getDecisionKey(d, i)
            return (
              <DecisionCard
                key={key}
                decision={d}
                manualState={manualConfirmState[key]}
                onConfirm={
                  d.decision === 'confirm'
                    ? (approved) => handleConfirmAction(key, d.audit_id, approved)
                    : undefined
                }
              />
            )
          })}
        </Card>
      )}
    </div>
  )
}
