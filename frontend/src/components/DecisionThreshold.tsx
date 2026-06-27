import { Typography } from 'antd'
import type { DecisionThresholdItem } from '../utils/policy'
import { getDecisionColor, getThresholdMeta } from '../utils/policy'

interface DecisionThresholdProps {
  thresholds: DecisionThresholdItem[]
}

export default function DecisionThreshold({ thresholds }: DecisionThresholdProps) {
  if (thresholds.length === 0) {
    return <Typography.Text type="secondary">暂无配置</Typography.Text>
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {thresholds.map((item) => {
        const meta = getThresholdMeta(item.key)
        const decisionColor = getDecisionColor(item.decision)
        return (
          <div
            key={item.key}
            style={{
              flex: '1 1 180px',
              minWidth: 160,
              padding: '16px 18px',
              borderRadius: 12,
              border: `1px solid ${decisionColor}33`,
              background: `linear-gradient(180deg, #ffffff 0%, ${decisionColor}08 100%)`,
            }}
          >
            <Typography.Text strong style={{ color: '#0f172a', fontSize: 15 }}>
              {item.min}-{item.max}
            </Typography.Text>
            <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>
              {meta.label}
            </div>
            <div
              style={{
                marginTop: 10,
                fontWeight: 600,
                color: decisionColor,
                fontSize: 14,
              }}
            >
              {item.decision} · {meta.decisionText}
            </div>
          </div>
        )
      })}
    </div>
  )
}
