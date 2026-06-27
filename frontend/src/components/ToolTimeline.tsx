import type { ReactNode } from 'react'
import { Card, Divider, Timeline, Typography } from 'antd'
import type { ShieldDecision } from '../api/client'
import {
  CARD_STYLE,
  type ManualConfirmState,
  getAuditTimelineMeta,
  getDecisionKey,
  getDecisionTimelineMeta,
  getExecutionTimelineMeta,
  maskSensitiveText,
  RISK_TIMELINE_COLORS,
} from '../utils/chat'
import {
  formatToolInterceptText,
  getRiskLevelLabel,
  getToolLabel,
} from '../utils/displayMaps'

interface ToolTimelineProps {
  userMessage: string
  thought: string
  decisions: ShieldDecision[]
  manualConfirmState: ManualConfirmState
}

function buildToolTimelineItems(
  decision: ShieldDecision,
  index: number,
  manualConfirmState: ManualConfirmState,
): Array<{ color: string; children: ReactNode }> {
  const key = getDecisionKey(decision, index)
  const manualState = manualConfirmState[key]
  const riskColor = RISK_TIMELINE_COLORS[decision.risk_level] ?? 'blue'
  const decisionMeta = getDecisionTimelineMeta(decision, manualState)
  const executionMeta = getExecutionTimelineMeta(decision, manualState)
  const auditMeta = getAuditTimelineMeta(decision)

  return [
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>AgentShield 拦截</Typography.Text>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {formatToolInterceptText(decision.tool_name)}
          </div>
        </div>
      ),
    },
    {
      color: riskColor,
      children: (
        <div>
          <Typography.Text strong>策略引擎风险评分</Typography.Text>
          <div style={{ fontSize: 13 }}>
            {getRiskLevelLabel(decision.risk_level)} · {decision.risk_score} 分
          </div>
        </div>
      ),
    },
    {
      color: decisionMeta.color,
      children: (
        <div>
          <Typography.Text strong>执行决策</Typography.Text>
          <div style={{ fontSize: 13, color: decisionMeta.color }}>{decisionMeta.text}</div>
        </div>
      ),
    },
    {
      color: executionMeta.color,
      children: (
        <div>
          <Typography.Text strong>工具执行 / 阻断 / 脱敏</Typography.Text>
          <div style={{ fontSize: 13, color: executionMeta.color }}>{executionMeta.text}</div>
          {decision.result_preview && decision.decision !== 'confirm' && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {maskSensitiveText(decision.result_preview).slice(0, 80)}
            </div>
          )}
        </div>
      ),
    },
    {
      color: auditMeta.color,
      children: (
        <div>
          <Typography.Text strong>写入审计日志</Typography.Text>
          <div style={{ fontSize: 13, color: auditMeta.color }}>{auditMeta.text}</div>
        </div>
      ),
    },
  ]
}

export default function ToolTimeline({
  userMessage,
  thought,
  decisions,
  manualConfirmState,
}: ToolTimelineProps) {
  const sharedItems: Array<{ color: string; children: ReactNode }> = [
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>用户输入</Typography.Text>
          <div style={{ fontSize: 13, color: '#64748b' }}>{userMessage}</div>
        </div>
      ),
    },
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>Agent 生成工具调用计划</Typography.Text>
          <div style={{ fontSize: 13, color: '#64748b' }}>{thought || '—'}</div>
        </div>
      ),
    },
  ]

  return (
    <Card title="工具调用链时间线" style={CARD_STYLE}>
      <Timeline items={sharedItems} />

      {decisions.length === 0 ? (
        <Typography.Text type="secondary">暂无工具调用决策</Typography.Text>
      ) : (
        decisions.map((d, i) => (
          <div key={getDecisionKey(d, i)} style={{ marginTop: 8 }}>
            <Divider style={{ margin: '16px 0 12px' }} />
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              工具 #{i + 1}：{getToolLabel(d.tool_name)}
            </Typography.Text>
            <Timeline items={buildToolTimelineItems(d, i, manualConfirmState)} />
          </div>
        ))
      )}
    </Card>
  )
}
