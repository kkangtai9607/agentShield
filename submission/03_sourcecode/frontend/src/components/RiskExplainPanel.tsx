import { Card, List, Space, Tag, Typography } from 'antd'
import type { ShieldDecision } from '../api/client'
import {
  CARD_STYLE,
  DECISION_COLORS,
  DECISION_LABELS,
  classifyRiskRule,
  parseRiskReasons,
  RULE_TAG_COLORS,
} from '../utils/chat'

const LEVEL_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: '#cf1322',
}

interface RiskExplainPanelProps {
  decisions: ShieldDecision[]
}

export default function RiskExplainPanel({ decisions }: RiskExplainPanelProps) {
  if (decisions.length === 0) return null

  const allRules = decisions.flatMap((d) => parseRiskReasons(d.reason))
  const semanticHits = decisions.flatMap((d) => d.semantic_hits ?? [])
  const primary = decisions[decisions.length - 1]

  return (
    <Card title="风险解释" style={CARD_STYLE}>
      {semanticHits.length > 0 && (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            语义检查命中（{primary.semantic_mode ?? 'local'}）：
          </Typography.Text>
          <List
            size="small"
            style={{ marginBottom: 12 }}
            dataSource={semanticHits}
            renderItem={(hit) => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Tag color="purple">
                  {hit.intent_label} · {Math.round(hit.similarity * 100)}% · {hit.channel}
                </Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  参考话术: {hit.matched_phrase}
                </Typography.Text>
              </List.Item>
            )}
          />
        </>
      )}

      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        命中风险规则：
      </Typography.Text>
      {allRules.length > 0 ? (
        <List
          size="small"
          dataSource={allRules}
          renderItem={(item) => {
            const kind = classifyRiskRule(item)
            return (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Tag color={RULE_TAG_COLORS[kind]}>{item}</Tag>
              </List.Item>
            )
          }}
        />
      ) : (
        <Typography.Text type="secondary">未命中额外风险规则</Typography.Text>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#f7fbff',
          borderRadius: 8,
          border: '1px solid #e6f0ff',
        }}
      >
        <Space wrap>
          <Typography.Text>
            总风险分：<Typography.Text strong>{primary.risk_score}</Typography.Text>
          </Typography.Text>
          <Typography.Text>
            风险等级：
            <Tag color={LEVEL_COLORS[primary.risk_level] ?? 'default'}>{primary.risk_level}</Tag>
          </Typography.Text>
          <Typography.Text>
            最终决策：
            <Tag color={DECISION_COLORS[primary.decision] ?? 'default'}>
              {DECISION_LABELS[primary.decision] ?? primary.decision}
            </Tag>
          </Typography.Text>
        </Space>
      </div>
    </Card>
  )
}
