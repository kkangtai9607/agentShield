import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Empty, message, Table, Tag, Tooltip, Typography } from 'antd'
import { api, type AuditLog } from '../api/client'
import AuditDetailDrawer from '../components/AuditDetailDrawer'
import AuditFilterBar from '../components/AuditFilterBar'
import AuditStatsCards from '../components/AuditStatsCards'
import RiskTag from '../components/RiskTag'
import {
  computeAuditStats,
  DEFAULT_FILTER,
  DECISION_COLORS,
  DECISION_LABELS,
  exportAuditCsv,
  filterAuditLogs,
  formatRoleLabel,
  formatTimestamp,
  formatToolArgsSummary,
  getRowBackground,
  maskAuditSensitiveText,
  truncateReason,
  type AuditFilterState,
} from '../utils/audit'
import { getToolLabel, getToolTagColor } from '../utils/displayMaps'

export default function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AuditFilterState>({ ...DEFAULT_FILTER })
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadLogs = useCallback(async (showSuccess?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAuditLogs()
      setLogs(data)
      if (showSuccess) message.success('审计日志已刷新')
    } catch {
      setError('审计日志加载失败，请确认后端服务是否启动。')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    const idParam = searchParams.get('id')
    if (!idParam || logs.length === 0) return
    const targetId = Number(idParam)
    if (Number.isNaN(targetId)) return
    const log = logs.find((l) => l.id === targetId)
    if (log) {
      setDetailLog(log)
      setDrawerOpen(true)
    }
  }, [logs, searchParams])

  const closeDetail = () => {
    setDrawerOpen(false)
    setDetailLog(null)
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      setSearchParams(next, { replace: true })
    }
  }

  const filteredLogs = useMemo(() => filterAuditLogs(logs, filter), [logs, filter])
  const stats = useMemo(() => computeAuditStats(logs), [logs])

  const openDetail = (log: AuditLog) => {
    setDetailLog(log)
    setDrawerOpen(true)
  }

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      message.warning('没有可导出的审计记录')
      return
    }
    exportAuditCsv(filteredLogs)
    message.success('CSV 已导出')
  }

  const columns = [
    {
      title: '时间',
      key: 'timestamp',
      width: 170,
      render: (_: unknown, r: AuditLog) => formatTimestamp(r.timestamp),
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
    },
    {
      title: '角色',
      key: 'user_role',
      width: 120,
      render: (_: unknown, r: AuditLog) => formatRoleLabel(r.user_role),
    },
    {
      title: '工具',
      key: 'tool_name',
      width: 110,
      render: (_: unknown, r: AuditLog) => (
        <Tooltip title={r.tool_name}>
          <Tag color={getToolTagColor(r.tool_name)}>{getToolLabel(r.tool_name)}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '参数摘要',
      key: 'tool_args',
      width: 200,
      ellipsis: true,
      render: (_: unknown, r: AuditLog) =>
        maskAuditSensitiveText(formatToolArgsSummary(r.tool_name, r.tool_args)),
    },
    {
      title: '风险',
      key: 'risk',
      width: 100,
      render: (_: unknown, r: AuditLog) => (
        <RiskTag level={r.risk_level} score={r.risk_score} />
      ),
    },
    {
      title: '决策',
      key: 'decision',
      width: 100,
      render: (_: unknown, r: AuditLog) => (
        <Tag color={DECISION_COLORS[r.decision]}>
          {DECISION_LABELS[r.decision] ?? r.decision}
        </Tag>
      ),
    },
    {
      title: '原因',
      key: 'reason',
      ellipsis: true,
      render: (_: unknown, r: AuditLog) => {
        const text = maskAuditSensitiveText(r.reason)
        const short = truncateReason(text, 50)
        return short.length < text.length ? (
          <Tooltip title={text}>{short}</Tooltip>
        ) : (
          short
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, r: AuditLog) => (
        <Button type="link" size="small" onClick={() => openDetail(r)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>安全审计中心</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        记录 Agent 工具调用全过程，包括用户输入、工具计划、风险评分、拦截决策和执行结果，便于安全复盘与合规追踪。
      </Typography.Paragraph>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <AuditStatsCards stats={stats} />

      <AuditFilterBar
        filter={filter}
        onChange={setFilter}
        onRefresh={() => loadLogs(true)}
        onExport={handleExport}
        loading={loading}
      />

      <Table
        dataSource={filteredLogs}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
        locale={{
          emptyText: logs.length === 0 ? (
            <Empty description="暂无审计日志，请先在 Agent 对话或攻击演示中运行一次检测" />
          ) : (
            <Empty description="没有符合条件的审计记录，请调整筛选条件" />
          ),
        }}
        onRow={(record) => ({
          style: { background: getRowBackground(record.decision) },
        })}
      />

      <AuditDetailDrawer
        log={detailLog}
        open={drawerOpen}
        onClose={closeDetail}
        onResolved={() => loadLogs()}
      />
    </div>
  )
}
