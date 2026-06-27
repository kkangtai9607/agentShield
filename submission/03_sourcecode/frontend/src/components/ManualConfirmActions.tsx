import { useState } from 'react'
import { Alert, Button, Space } from 'antd'
import type { ShieldDecision } from '../api/client'
import type { ManualConfirmEntry } from '../utils/chat'

interface ManualConfirmActionsProps {
  decision: ShieldDecision
  manualState?: ManualConfirmEntry
  onConfirm: (approved: boolean) => Promise<void>
}

export default function ManualConfirmActions({
  decision,
  manualState,
  onConfirm,
}: ManualConfirmActionsProps) {
  const [loading, setLoading] = useState(false)

  if (decision.decision !== 'confirm') return null

  const run = async (approved: boolean) => {
    setLoading(true)
    try {
      await onConfirm(approved)
    } finally {
      setLoading(false)
    }
  }

  if (!manualState) {
    return (
      <Space style={{ marginTop: 12 }}>
        <Button type="primary" size="small" loading={loading} onClick={() => run(true)}>
          确认执行
        </Button>
        <Button size="small" loading={loading} onClick={() => run(false)}>
          取消执行
        </Button>
      </Space>
    )
  }

  if (manualState.status === 'confirmed') {
    return (
      <Alert
        type="success"
        showIcon
        style={{ marginTop: 12 }}
        message={manualState.message || '人工确认通过，工具已执行。'}
      />
    )
  }

  return (
    <Alert type="error" showIcon style={{ marginTop: 12 }} message="已取消该工具调用。" />
  )
}
