import { Button, Drawer, Tag, Tooltip, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { AuditLog } from '../api/client'
import RiskTag from './RiskTag'
import { truncateReason } from '../utils/audit'
import { getDecisionLabel, getToolLabel } from '../utils/displayMaps'

const DECISION_COLORS: Record<string, string> = {
  allow: 'success',
  mask: 'warning',
  confirm: 'processing',
  block: 'error',
}

function alertBorderColor(log: AuditLog): string {
  if (log.decision === 'block' || log.risk_level === 'critical') return '#ffccc7'
  if (log.risk_level === 'high' || log.decision === 'confirm') return '#ffe7ba'
  return '#e6f0ff'
}

function alertBgColor(log: AuditLog): string {
  if (log.decision === 'block' || log.risk_level === 'critical') return '#fff2f0'
  if (log.risk_level === 'high' || log.decision === 'confirm') return '#fffbe6'
  return '#f7fbff'
}

interface AlertDrawerProps {
  open: boolean
  onClose: () => void
  alerts: AuditLog[]
}

export default function AlertDrawer({ open, onClose, alerts }: AlertDrawerProps) {
  const navigate = useNavigate()

  return (
    <Drawer
      title="最近预警"
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      styles={{ body: { background: '#ffffff' } }}
      footer={
        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={() => { onClose(); navigate('/audit') }}>
            查看全部审计日志
          </Button>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            可在左侧「审计日志」页面查看完整记录
          </Typography.Text>
        </div>
      }
    >
      {alerts.length === 0 ? (
        <Typography.Text type="secondary">暂无新的高危预警</Typography.Text>
      ) : (
        alerts.map((item) => (
          <div
            key={item.id}
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${alertBorderColor(item)}`,
              background: alertBgColor(item),
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              时间：{item.timestamp?.replace('T', ' ').slice(0, 19)}
            </Typography.Text>
            <div style={{ marginTop: 6 }}>
              <Typography.Text>用户：{item.user_id}</Typography.Text>
            </div>
            <div>
              <Typography.Text>
                工具：
                <Tooltip title={item.tool_name}>
                  <span>{getToolLabel(item.tool_name)}</span>
                </Tooltip>
              </Typography.Text>
            </div>
            <div style={{ marginTop: 4 }}>
              风险：<RiskTag level={item.risk_level} score={item.risk_score} />
              <Tag color={DECISION_COLORS[item.decision] ?? 'default'} style={{ marginLeft: 8 }}>
                {getDecisionLabel(item.decision)}
              </Tag>
            </div>
            <Typography.Paragraph
              type="secondary"
              style={{ marginTop: 8, fontSize: 13, marginBottom: 0 }}
            >
              原因：{truncateReason(item.reason)}
            </Typography.Paragraph>
          </div>
        ))
      )}
    </Drawer>
  )
}
