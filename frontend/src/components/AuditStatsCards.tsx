import { Card, Col, Row, Statistic } from 'antd'
import type { AuditStats } from '../utils/audit'
import { CARD_STYLE } from '../utils/audit'

interface AuditStatsCardsProps {
  stats: AuditStats
}

export default function AuditStatsCards({ stats }: AuditStatsCardsProps) {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={8} md={4}>
        <Card style={CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
          <Statistic title="总审计记录" value={stats.total} valueStyle={{ color: '#1677ff' }} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={5}>
        <Card style={CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
          <Statistic title="阻断次数" value={stats.blockCount} valueStyle={{ color: '#ff4d4f' }} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={5}>
        <Card style={CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
          <Statistic title="人工确认次数" value={stats.confirmCount} valueStyle={{ color: '#faad14' }} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={5}>
        <Card style={CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
          <Statistic
            title="高危/严重调用"
            value={stats.highRiskCount}
            valueStyle={{ color: '#a8071a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={5}>
        <Card style={CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
          <Statistic title="今日新增审计" value={stats.todayCount} valueStyle={{ color: '#52c41a' }} />
        </Card>
      </Col>
    </Row>
  )
}
