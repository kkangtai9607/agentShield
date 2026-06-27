import { Card, Tag, Typography } from 'antd'
import type { ShieldDecision } from '../api/client'
import ManualConfirmActions from './ManualConfirmActions'
import RiskTag from './RiskTag'
import type { ManualConfirmEntry } from '../utils/chat'
import { getDecisionLabel, getToolLabel } from '../utils/displayMaps'

const DECISION_TAG_COLORS: Record<string, string> = {
  allow: 'success',
  mask: 'warning',
  confirm: 'processing',
  block: 'error',
}

export default function DecisionCard({
  decision,
  manualState,
  onConfirm,
}: {
  decision: ShieldDecision
  manualState?: ManualConfirmEntry
  onConfirm?: (approved: boolean) => Promise<void>
}) {
  const tagColor = DECISION_TAG_COLORS[decision.decision] ?? 'default'
  const label = getDecisionLabel(decision.decision)
  const borderColor =
    decision.decision === 'block'
      ? '#ff4d4f'
      : decision.decision === 'confirm'
        ? '#faad14'
        : '#1677ff'

  return (
    <Card
      size="small"
      title={`${getToolLabel(decision.tool_name)} - AgentShield 决策`}
      style={{
        marginBottom: 8,
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <RiskTag level={decision.risk_level} score={decision.risk_score} />
        <Tag color={tagColor}>{label}</Tag>
        {decision.executed && <Tag color="blue">已执行</Tag>}
        {decision.audit_id && <Tag>审计 #{decision.audit_id}</Tag>}
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
        原因: {decision.reason}
      </Typography.Paragraph>
      {decision.result_preview && (
        <Typography.Paragraph style={{ fontSize: 12 }}>
          结果预览: {decision.result_preview}
        </Typography.Paragraph>
      )}
      {onConfirm && decision.decision === 'confirm' && (
        <ManualConfirmActions
          decision={decision}
          manualState={manualState}
          onConfirm={onConfirm}
        />
      )}
    </Card>
  )
}
