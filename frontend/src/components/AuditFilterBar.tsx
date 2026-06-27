import { Button, Card, Input, Select, Space, Switch } from 'antd'
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { AuditFilterState } from '../utils/audit'
import { DEFAULT_FILTER } from '../utils/audit'
import { TOOL_SELECT_OPTIONS } from '../utils/displayMaps'
import { useProfile } from '../context/ProfileContext'
import './AuditFilterBar.css'

interface AuditFilterBarProps {
  filter: AuditFilterState
  onChange: (filter: AuditFilterState) => void
  onRefresh: () => void
  onExport: () => void
  loading?: boolean
}

export default function AuditFilterBar({
  filter,
  onChange,
  onRefresh,
  onExport,
  loading,
}: AuditFilterBarProps) {
  const { roleLabels, formatRole } = useProfile()
  const set = (patch: Partial<AuditFilterState>) => onChange({ ...filter, ...patch })
  const roleOptions = Object.keys(roleLabels).length
    ? Object.entries(roleLabels).map(([value, label]) => ({ value, label }))
    : Object.entries({ student: '学生', teacher: '教师', admin: '管理员', owner: '主人', guest: '访客', agent: '客服', supervisor: '主管' }).map(([value, label]) => ({ value, label: formatRole(value) }))

  return (
    <Card className="audit-filter-card" bordered={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="audit-filter-row-main">
          <Input
            placeholder="用户 ID"
            value={filter.userId}
            onChange={(e) => set({ userId: e.target.value })}
            allowClear
          />
          <Select
            placeholder="角色"
            value={filter.role}
            onChange={(v) => set({ role: v })}
            allowClear
            style={{ width: '100%' }}
            options={roleOptions}
          />
          <Select
            placeholder="工具类型"
            value={filter.toolName}
            onChange={(v) => set({ toolName: v })}
            allowClear
            style={{ width: '100%' }}
            options={TOOL_SELECT_OPTIONS}
          />
          <Select
            placeholder="风险等级"
            value={filter.riskLevel}
            onChange={(v) => set({ riskLevel: v })}
            allowClear
            style={{ width: '100%' }}
            options={[
              { value: 'low', label: '低' },
              { value: 'medium', label: '中' },
              { value: 'high', label: '高' },
              { value: 'critical', label: '严重' },
            ]}
          />
          <Select
            placeholder="决策类型"
            value={filter.decision}
            onChange={(v) => set({ decision: v })}
            allowClear
            style={{ width: '100%' }}
            options={[
              { value: 'allow', label: '放行' },
              { value: 'mask', label: '脱敏' },
              { value: 'confirm', label: '人工确认' },
              { value: 'block', label: '阻断' },
            ]}
          />
        </div>

        <div className="audit-filter-row-actions">
          <Input
            className="audit-keyword-input"
            prefix={<SearchOutlined />}
            placeholder="关键词搜索"
            value={filter.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            allowClear
          />

          <div className="audit-actions">
            <Space size={12} wrap>
              <Space size={8}>
                <span className="audit-actions-label">只看高危/阻断</span>
                <Switch
                  checked={filter.highRiskOnly}
                  onChange={(v) => set({ highRiskOnly: v })}
                />
              </Space>
              <Button onClick={() => onChange({ ...DEFAULT_FILTER })}>重置筛选</Button>
              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                刷新日志
              </Button>
              <Button icon={<DownloadOutlined />} onClick={onExport}>导出 CSV</Button>
            </Space>
          </div>
        </div>
      </Space>
    </Card>
  )
}
