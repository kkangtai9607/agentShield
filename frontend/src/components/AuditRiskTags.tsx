import { Alert, Space, Tag, Typography } from 'antd'
import {
  classifyRiskRule,
  parseRiskReasons,
  RULE_TAG_COLORS,
  type RiskRuleType,
} from '../utils/audit'

interface AuditRiskTagsProps {
  reason: string
}

export default function AuditRiskTags({ reason }: AuditRiskTagsProps) {
  const rules = parseRiskReasons(reason)

  if (rules.length === 0) {
    return <Typography.Text type="secondary">暂无风险说明</Typography.Text>
  }

  const allPass = rules.every((r) => classifyRiskRule(r) === 'pass')

  if (allPass && rules.length === 1) {
    return (
      <Alert type="success" showIcon message={rules[0]} style={{ marginTop: 8 }} />
    )
  }

  return (
    <div>
      <Typography.Text strong style={{ fontSize: 13 }}>命中风险规则：</Typography.Text>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
        {rules.map((rule, i) => {
          const type = classifyRiskRule(rule) as RiskRuleType
          return (
            <li key={i} style={{ marginBottom: 6 }}>
              <Space size={4}>
                <Tag color={RULE_TAG_COLORS[type]} style={{ margin: 0 }}>
                  {rule}
                </Tag>
              </Space>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
