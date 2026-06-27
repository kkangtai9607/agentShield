import { InputNumber, Typography } from 'antd'
import type { DecisionThresholdItem } from '../utils/policy'
import { getDecisionColor, getThresholdMeta } from '../utils/policy'

interface PolicyThresholdEditorProps {
  thresholds: DecisionThresholdItem[]
  onChange: (key: string, field: 'min' | 'max', value: number) => void
}

export default function PolicyThresholdEditor({
  thresholds,
  onChange,
}: PolicyThresholdEditorProps) {
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
              flex: '1 1 220px',
              minWidth: 200,
              padding: '16px 18px',
              borderRadius: 12,
              border: `1px solid ${decisionColor}33`,
              background: `linear-gradient(180deg, #ffffff 0%, ${decisionColor}08 100%)`,
            }}
          >
            <Typography.Text strong style={{ fontSize: 15 }}>
              {meta.label}
            </Typography.Text>
            <div style={{ marginTop: 8, color: decisionColor, fontWeight: 600 }}>
              {item.decision} · {meta.decisionText}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>分数</span>
              <InputNumber
                size="small"
                min={0}
                max={100}
                value={item.min}
                onChange={(v) => onChange(item.key, 'min', Number(v ?? 0))}
              />
              <span>—</span>
              <InputNumber
                size="small"
                min={0}
                max={100}
                value={item.max}
                onChange={(v) => onChange(item.key, 'max', Number(v ?? 0))}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
