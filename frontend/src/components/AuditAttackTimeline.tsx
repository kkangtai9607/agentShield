import type { ReactNode } from 'react'
import { Alert, Tag, Timeline, Typography } from 'antd'
import type { AuditLog } from '../api/client'
import {
  detectHighRiskHighlights,
  formatToolArgsSummary,
  getExecutionStatusText,
  maskAuditSensitiveText,
} from '../utils/audit'
import {
  getDecisionLabel,
  getRiskLevelLabel,
  getToolLabel,
} from '../utils/displayMaps'

interface AuditAttackTimelineProps {
  log: AuditLog
}

const DECISION_TIMELINE_COLORS: Record<string, string> = {
  allow: 'green',
  mask: 'blue',
  confirm: 'orange',
  block: 'red',
}

export default function AuditAttackTimeline({ log }: AuditAttackTimelineProps) {
  const highlights = detectHighRiskHighlights(log)
  const argsSummary = formatToolArgsSummary(log.tool_name, log.tool_args)
  const decColor = DECISION_TIMELINE_COLORS[log.decision] ?? 'gray'
  const decLabel = getDecisionLabel(log.decision)

  const items: Array<{ color: string; children: ReactNode }> = [
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>用户输入</Typography.Text>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {maskAuditSensitiveText(log.user_input || '—')}
          </div>
        </div>
      ),
    },
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>Agent 生成工具调用计划</Typography.Text>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {getToolLabel(log.tool_name)}
            {log.agent_plan
              ? ` · ${maskAuditSensitiveText(log.agent_plan).slice(0, 80)}`
              : ''}
          </div>
        </div>
      ),
    },
    {
      color: 'blue',
      children: (
        <div>
          <Typography.Text strong>AgentShield 拦截工具调用</Typography.Text>
          <div style={{ fontSize: 13 }}>
            <Tag color="blue">{getToolLabel(log.tool_name)}</Tag>
            <span style={{ color: '#64748b', marginLeft: 8 }}>
              {maskAuditSensitiveText(argsSummary)}
            </span>
          </div>
        </div>
      ),
    },
    {
      color: log.risk_level === 'high' || log.risk_level === 'critical' ? 'red' : 'orange',
      children: (
        <div>
          <Typography.Text strong>策略引擎风险评分</Typography.Text>
          <div style={{ fontSize: 13 }}>
            {getRiskLevelLabel(log.risk_level)} · {log.risk_score} 分
          </div>
        </div>
      ),
    },
    {
      color: decColor,
      children: (
        <div>
          <Typography.Text strong>最终决策</Typography.Text>
          <div style={{ fontSize: 13, color: decColor }}>{decLabel}</div>
        </div>
      ),
    },
    {
      color: decColor,
      children: (
        <div>
          <Typography.Text strong>工具执行状态</Typography.Text>
          <div style={{ fontSize: 13, color: decColor }}>
            {getExecutionStatusText(log.decision)}
          </div>
        </div>
      ),
    },
    {
      color: 'green',
      children: (
        <div>
          <Typography.Text strong>写入审计日志</Typography.Text>
          <div style={{ fontSize: 13, color: '#52c41a' }}>审计 #{log.id}</div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>工具调用链复盘</Typography.Title>
      {highlights.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {highlights.map((h) => (
            <Alert
              key={h}
              type="error"
              showIcon
              message={h}
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      )}
      <Timeline items={items} />
    </div>
  )
}
