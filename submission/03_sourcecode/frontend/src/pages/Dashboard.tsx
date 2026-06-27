import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Row, Typography } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import { getAuditLogs } from '../api/client'
import type { AuditLog } from '../api/client'
import AlertDrawer from '../components/AlertDrawer'
import SecurityCharts from '../components/SecurityCharts'
import {
  buildRiskDistData,
  buildTrendData,
  isAlertLog,
  isToday,
  isUnreadAlert,
  markAlertsAsReadInStorage,
  readStoredAlertId,
  readStoredAlertTime,
} from '../utils/audit'

export default function Dashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastAlertReadTime, setLastAlertReadTime] = useState(readStoredAlertTime)
  const [lastAlertReadId, setLastAlertReadId] = useState(readStoredAlertId)

  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await getAuditLogs()
      setLogs(data)
    } catch (e) {
      console.error('load audit logs failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAuditLogs()
    const timer = setInterval(loadAuditLogs, 5000)
    return () => clearInterval(timer)
  }, [loadAuditLogs])

  const alertLogs = useMemo(
    () => logs.filter(isAlertLog),
    [logs],
  )

  const recentAlerts = useMemo(() => alertLogs.slice(0, 10), [alertLogs])

  const unreadAlerts = useMemo(
    () => alertLogs.filter((log) => isUnreadAlert(log, lastAlertReadTime, lastAlertReadId)),
    [alertLogs, lastAlertReadTime, lastAlertReadId],
  )

  const markAlertsAsRead = useCallback(() => {
    const { time, id } = markAlertsAsReadInStorage(alertLogs)
    setLastAlertReadTime(time)
    setLastAlertReadId(id)
  }, [alertLogs])

  const handleOpenDrawer = () => {
    setDrawerOpen(true)
    markAlertsAsRead()
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
  }

  const todayCount = logs.filter((l) => isToday(l.timestamp)).length
  const blocked = logs.filter((l) => l.decision === 'block').length
  const masked = logs.filter((l) => l.decision === 'mask').length
  const highRisk = logs.filter(
    (l) =>
      l.risk_level === 'high' ||
      l.risk_level === 'critical' ||
      Number(l.risk_score ?? 0) >= 60,
  ).length

  const trendData = buildTrendData(logs, 20)
  const riskDistData = buildRiskDistData(logs)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          安全仪表盘
        </Typography.Title>
        <Badge count={unreadAlerts.length} overflowCount={99} offset={[-4, 4]}>
          <Button
            type="primary"
            danger
            icon={<BellOutlined />}
            onClick={handleOpenDrawer}
          >
            最近预警
          </Button>
        </Badge>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Typography.Text type="secondary">今日工具调用</Typography.Text>
            <Typography.Title level={2}>{todayCount}</Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Typography.Text type="secondary">阻断次数</Typography.Text>
            <Typography.Title level={2} style={{ color: '#ff4d4f' }}>
              {blocked}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Typography.Text type="secondary">脱敏次数</Typography.Text>
            <Typography.Title level={2} style={{ color: '#fa8c16' }}>
              {masked}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Typography.Text type="secondary">高危调用</Typography.Text>
            <Typography.Title level={2} style={{ color: '#a8071a' }}>
              {highRisk}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <SecurityCharts
        trendData={trendData}
        riskDistData={riskDistData}
        loading={loading && logs.length === 0}
      />

      <AlertDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        alerts={recentAlerts}
      />
    </div>
  )
}
