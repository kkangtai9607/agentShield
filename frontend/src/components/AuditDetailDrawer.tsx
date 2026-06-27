import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Space, Tag, Typography, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import type { AuditLog } from '../api/client'
import { api } from '../api/client'
import AuditAttackTimeline from './AuditAttackTimeline'
import AuditRiskTags from './AuditRiskTags'
import RiskTag from './RiskTag'
import {
  DECISION_COLORS,
  DECISION_LABELS,
  formatJsonDisplay,
  formatRoleLabel,
  formatTimestamp,
  getDecisionDescription,
  maskAuditSensitiveText,
} from '../utils/audit'
import { getToolLabel } from '../utils/displayMaps'

const CODE_BLOCK_STYLE: CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  maxHeight: 240,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  margin: 0,
}

interface AuditDetailDrawerProps {
  log: AuditLog | null
  open: boolean
  onClose: () => void
  onResolved?: () => void
}

function CopyableBlock({ text, emptyText }: { text: string; emptyText: string }) {
  const display = maskAuditSensitiveText(text)
  if (!text) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>
  }
  return (
    <div>
      <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 13 }}>
        {display}
      </div>
      <Button
        type="link"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => navigator.clipboard.writeText(display)}
        style={{ marginTop: 4 }}
      >
        复制
      </Button>
    </div>
  )
}

export default function AuditDetailDrawer({ log, open, onClose, onResolved }: AuditDetailDrawerProps) {
  const [confirmLoading, setConfirmLoading] = useState(false)

  if (!log) return null

  const decLabel = DECISION_LABELS[log.decision] ?? log.decision
  const isPendingConfirm = log.decision === 'confirm'

  const handleConfirm = async (approved: boolean) => {
    setConfirmLoading(true)
    try {
      const res = await api.confirmShield(log.id, approved)
      message.success(res.data.message)
      onResolved?.()
      onClose()
    } catch {
      message.error('人工确认操作失败，请确认后端已启动且记录仍为待确认状态')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <Drawer
      title={`审计详情 #${log.id}`}
      open={open}
      onClose={onClose}
      width={760}
      destroyOnClose
    >
      <Card size="small" title="基础信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="审计 ID">{log.id}</Descriptions.Item>
          <Descriptions.Item label="时间">{formatTimestamp(log.timestamp)}</Descriptions.Item>
          <Descriptions.Item label="用户 ID">{log.user_id}</Descriptions.Item>
          <Descriptions.Item label="用户角色">{formatRoleLabel(log.user_role)}</Descriptions.Item>
          <Descriptions.Item label="会话 ID">{log.session_id || '—'}</Descriptions.Item>
          <Descriptions.Item label="工具名称">{getToolLabel(log.tool_name)}</Descriptions.Item>
          <Descriptions.Item label="工具标识">
            <Typography.Text code>{log.tool_name}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="风险等级">
            <RiskTag level={log.risk_level} />
          </Descriptions.Item>
          <Descriptions.Item label="风险分">{log.risk_score}</Descriptions.Item>
          <Descriptions.Item label="决策">
            <Tag color={DECISION_COLORS[log.decision]}>{decLabel}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="用户原始输入" style={{ marginBottom: 16 }}>
        <CopyableBlock text={log.user_input} emptyText="暂无用户输入" />
      </Card>

      <Card size="small" title="Agent 原始计划" style={{ marginBottom: 16 }}>
        <pre style={CODE_BLOCK_STYLE}>
          {log.agent_plan ? formatJsonDisplay(log.agent_plan) : '暂无 Agent 计划'}
        </pre>
      </Card>

      <Card size="small" title="工具调用参数" style={{ marginBottom: 16 }}>
        <pre style={CODE_BLOCK_STYLE}>
          {log.tool_args ? formatJsonDisplay(log.tool_args) : '暂无参数'}
        </pre>
      </Card>

      <Card size="small" title="AgentShield 决策" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 8 }}>
          <Tag color={DECISION_COLORS[log.decision]}>{decLabel}</Tag>
          <RiskTag level={log.risk_level} score={log.risk_score} />
        </Space>
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          {getDecisionDescription(log.decision)}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 13 }}>
          <Typography.Text strong>原因：</Typography.Text>
          {maskAuditSensitiveText(log.reason)}
        </Typography.Paragraph>
        {log.result_preview && (
          <Typography.Paragraph style={{ fontSize: 13 }}>
            <Typography.Text strong>结果预览：</Typography.Text>
            {maskAuditSensitiveText(log.result_preview)}
          </Typography.Paragraph>
        )}
        {isPendingConfirm && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="该工具调用等待人工确认"
            description="批准后 AgentShield 将执行该工具并更新本条审计记录。"
            action={
              <Space direction="vertical" size={4}>
                <Button
                  type="primary"
                  size="small"
                  loading={confirmLoading}
                  onClick={() => handleConfirm(true)}
                >
                  批准执行
                </Button>
                <Button size="small" loading={confirmLoading} onClick={() => handleConfirm(false)}>
                  拒绝执行
                </Button>
              </Space>
            }
          />
        )}
      </Card>

      <Card size="small" title="风险解释" style={{ marginBottom: 16 }}>
        <AuditRiskTags reason={log.reason} />
      </Card>

      <Card size="small" style={{ marginBottom: 16 }}>
        <AuditAttackTimeline log={log} />
      </Card>

      <Card size="small" title="执行结果预览">
        <pre style={CODE_BLOCK_STYLE}>
          {log.result_preview
            ? maskAuditSensitiveText(log.result_preview)
            : '暂无执行结果'}
        </pre>
      </Card>
    </Drawer>
  )
}
