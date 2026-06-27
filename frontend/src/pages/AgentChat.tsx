import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Tag,
  Typography,
  message,
} from 'antd'
import axios from 'axios'
import { api } from '../api/client'
import type { ChatResponse, ShieldDecision } from '../api/client'
import AgentPlanPanel from '../components/AgentPlanPanel'
import ExampleRequestCards from '../components/ExampleRequestCards'
import RolePermissionCard from '../components/RolePermissionCard'
import RiskExplainPanel from '../components/RiskExplainPanel'
import ShieldDecisionPanel from '../components/ShieldDecisionPanel'
import ToolTimeline from '../components/ToolTimeline'
import { getStoredUser } from '../utils/auth'
import { useManualConfirm } from '../hooks/useManualConfirm'
import {
  CARD_STYLE,
  maskSensitiveText,
  normalizeChatResponse,
} from '../utils/chat'
import { getPolicies } from '../api/client'
import { useProfile } from '../context/ProfileContext'
import { getChatExamplesForProfile } from '../data/profileExamples'

function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
    if (e.response?.status === 404) return '接口不存在，请确认后端已启动且端口为 8000'
    if (e.code === 'ERR_NETWORK') return '无法连接后端，请先启动: uvicorn app.main:app --reload --port 8000'
    return e.message
  }
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message)
  return '请求失败'
}

export default function AgentChat() {
  const authUser = getStoredUser()
  const { formatRole, profileName, activeProfile, roleLabels } = useProfile()
  const userRole = authUser?.user_role ?? 'student'
  const { normal: normalExamples, attack: attackExamples, confirm: confirmExamples, semantic: semanticExamples } =
    getChatExamplesForProfile(activeProfile)
  const roleValidInProfile = userRole in roleLabels
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, string>>>({})
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState('')
  const [response, setResponse] = useState<ChatResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { manualConfirmState, clearManualConfirm, handleConfirmAction } = useManualConfirm()

  useEffect(() => {
    getPolicies().then((p) => setRolePermissions((p.role_permissions as Record<string, Record<string, string>>) ?? {}))
  }, [profileName])

  const clearResults = () => {
    setResponse(null)
    setError(null)
    clearManualConfirm()
    setLastMessage('')
  }

  const onConfirmAction = (
    key: string,
    status: 'confirmed' | 'cancelled',
    resultMessage?: string,
    updatedDecision?: ShieldDecision,
  ) => {
    if (updatedDecision) {
      setResponse((prev) => {
        if (!prev) return prev
        const shield_decisions = prev.shield_decisions.map((d) =>
          d.audit_id === updatedDecision.audit_id ? { ...d, ...updatedDecision } : d,
        )
        return { ...prev, shield_decisions }
      })
    }
  }

  const applyExample = (ex: { message: string; role: string }) => {
    if (ex.role !== userRole) {
      message.warning(`该示例建议以「${formatRole(ex.role)}」身份登录后测试，当前为 ${formatRole(userRole)}`)
    }
    setMessageText(ex.message)
    clearResults()
  }

  const handleSend = async () => {
    const currentMessage = messageText.trim()
    if (!currentMessage) {
      clearResults()
      setError('请输入消息')
      return
    }

    const payload = { message: currentMessage }

    clearResults()
    setLoading(true)
    console.log('chat payload', payload)

    try {
      const res = await api.chat(payload)
      console.log('chat response', res.data)
      const normalized = normalizeChatResponse(res.data as unknown as Record<string, unknown>)
      if (!normalized.agent_plan) {
        throw new Error('后端返回数据格式异常')
      }
      setResponse(normalized)
      setLastMessage(currentMessage)
    } catch (e: unknown) {
      console.error('chat error', e)
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }

  const agentPlan = response?.agent_plan
  const decisions: ShieldDecision[] = response?.shield_decisions ?? []

  return (
    <div>
      <Typography.Title level={3}>Agent 对话 · 工具调用安全演示台</Typography.Title>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="当前为安全演示模式：系统会模拟 Agent 工具调用，并通过 AgentShield 网关进行实时拦截、风险评分和审计记录。"
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <span>
            当前登录：<Tag color="blue">{authUser?.name ?? authUser?.user_id}</Tag>
            身份 <Tag>{formatRole(userRole)}</Tag>
            场景 <Tag color="purple">{profileName}</Tag>（JWT 签发，不可伪造）
          </span>
        }
      />

      {!roleValidInProfile && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前身份「${formatRole(userRole)}」不属于「${profileName}」场景`}
          description="人工确认等策略按场景身份生效。请退出后使用本场景演示账号登录（如 owner01 / agent01），再测试人工确认示例。"
        />
      )}

      <Card title="当前身份权限" style={CARD_STYLE}>
        <RolePermissionCard role={userRole} rolePermissions={rolePermissions} />
      </Card>

      <ExampleRequestCards
        profileName={profileName}
        normalExamples={normalExamples}
        attackExamples={attackExamples}
        confirmExamples={confirmExamples}
        semanticExamples={semanticExamples}
        formatRole={formatRole}
        onSelect={applyExample}
      />

      <Card title="输入检测请求" style={CARD_STYLE}>
        <Input.TextArea
          rows={3}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="输入消息，例如：请发送邮件给 test@example.com，内容是课程报告已经完成"
          style={{ marginBottom: 12 }}
        />
        <Button type="primary" onClick={handleSend} loading={loading}>
          发送检测
        </Button>
      </Card>

      {loading && (
        <Card style={CARD_STYLE}>
          <Typography.Text>正在请求 Agent 计划与 AgentShield 决策…</Typography.Text>
        </Card>
      )}

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      {!loading && !response && !error && (
        <Card style={CARD_STYLE}>
          <Empty
            description={
              <div>
                <Typography.Title level={5}>开始一次工具调用安全检测</Typography.Title>
                <Typography.Paragraph type="secondary">
                  选择角色并输入请求，系统将展示 Agent 原始计划、AgentShield 风险决策、工具调用时间线和审计记录。
                </Typography.Paragraph>
                <Typography.Text type="secondary">快捷示例（{profileName}）：</Typography.Text>
                <ul style={{ textAlign: 'left', color: '#64748b', marginTop: 8 }}>
                  {normalExamples.slice(0, 2).map((ex) => (
                    <li key={ex.label}>{ex.message}</li>
                  ))}
                  {attackExamples.slice(0, 1).map((ex) => (
                    <li key={ex.label}>{ex.message}</li>
                  ))}
                </ul>
              </div>
            }
          />
        </Card>
      )}

      {response && agentPlan && !loading && (
        <>
          <Row gutter={20}>
            <Col xs={24} lg={12}>
              <AgentPlanPanel thought={agentPlan.thought} toolCalls={agentPlan.tool_calls} />
            </Col>
            <Col xs={24} lg={12}>
              <ShieldDecisionPanel
                decisions={decisions}
                manualConfirmState={manualConfirmState}
                onConfirmAction={onConfirmAction}
                onConfirmRequest={handleConfirmAction}
              />
            </Col>
          </Row>

          <ToolTimeline
            userMessage={lastMessage}
            thought={agentPlan.thought}
            decisions={decisions}
            manualConfirmState={manualConfirmState}
          />

          <RiskExplainPanel decisions={decisions} />

          {response.answer && (
            <Card title="最终结果" style={CARD_STYLE}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {maskSensitiveText(response.answer)}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
