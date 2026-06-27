import { useCallback, useEffect, useState } from 'react'
import { Badge, Space, Tag, Tooltip } from 'antd'
import { api } from '../api/client'
import { getStoredUser, clearAuth } from '../utils/auth'
import { useProfile } from '../context/ProfileContext'

interface HealthInfo {
  status: string
  use_mock_llm?: boolean
  plan_engine?: string
  audit_total?: number
  pending_confirm?: number
  semantic_check?: { enabled: boolean; mode: string }
}

export default function SystemStatusBar() {
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.health()
      setHealth(res.data)
      setError(false)
    } catch {
      setHealth(null)
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [load])

  if (error) {
    return (
      <Space size="middle">
        <Badge status="error" text="后端未连接" />
      </Space>
    )
  }

  if (!health) return null

  const user = getStoredUser()
  const { formatRole, profileName } = useProfile()

  return (
    <Space size="middle" style={{ fontSize: 13, fontWeight: 400 }}>
      {user && (
        <Tag color="geekblue">
          {user.name} · {formatRole(user.user_role)}
        </Tag>
      )}
      <Tag color="purple">{profileName}</Tag>
      <Badge status="success" text="后端在线" />
      <Tooltip title="演示模式使用 Mock 计划引擎，Shield 拦截逻辑与框架无关">
        <Tag color={health.use_mock_llm ? 'blue' : 'green'}>
          {health.use_mock_llm ? 'Mock LLM' : '真实 LLM'}
        </Tag>
      </Tooltip>
      <Tag>{health.plan_engine === 'build_mock_plan' ? '规则计划引擎' : 'LLM 计划引擎'}</Tag>
      {health.semantic_check?.enabled && (
        <Tag color="purple">语义检查 {health.semantic_check.mode}</Tag>
      )}
      {typeof health.audit_total === 'number' && (
        <Tag>审计 {health.audit_total} 条</Tag>
      )}
      {typeof health.pending_confirm === 'number' && health.pending_confirm > 0 && (
        <Tag color="warning">待确认 {health.pending_confirm}</Tag>
      )}
      {user && (
        <a onClick={() => { clearAuth(); window.location.href = '/login' }} style={{ fontSize: 13 }}>
          退出
        </a>
      )}
    </Space>
  )
}
