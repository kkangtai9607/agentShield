import type { CSSProperties } from 'react'
import { Typography } from 'antd'
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { RiskDistPoint, TrendPoint } from '../utils/audit'
import { getRiskColor } from '../utils/audit'
import { getDecisionLabel, getToolLabel } from '../utils/displayMaps'

const CHART_CARD_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 8px 24px rgba(15, 35, 70, 0.06)',
  border: '1px solid #e6f0ff',
  minHeight: 320,
  height: 340,
}

const TITLE_STYLE: CSSProperties = {
  color: '#0f172a',
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 4,
}

const SUBTITLE_STYLE: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  marginBottom: 12,
}

function LightTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; payload: TrendPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e6f0ff',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#1f2937',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(15, 35, 70, 0.08)',
      }}
    >
      <div>时间：{label}</div>
      <div>风险分：{p.risk_score}</div>
      <div>决策：{getDecisionLabel(p.decision)}</div>
      <div>工具：{getToolLabel(p.tool)}</div>
    </div>
  )
}

interface SecurityChartsProps {
  trendData: TrendPoint[]
  riskDistData: RiskDistPoint[]
  loading?: boolean
}

export default function SecurityCharts({ trendData, riskDistData, loading }: SecurityChartsProps) {
  const hasTrend = trendData.length > 0
  const hasDist = riskDistData.some((d) => d.value > 0)

  if (loading) {
    return (
      <div style={{ ...CHART_CARD_STYLE, textAlign: 'center', color: '#64748b', marginTop: 24 }}>
        加载图表数据…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 24 }}>
      <div style={{ ...CHART_CARD_STYLE, flex: '1.5 1 58%', minWidth: 280 }}>
        <div style={TITLE_STYLE}>安全趋势</div>
        <div style={SUBTITLE_STYLE}>最近 20 次工具调用风险分变化</div>
        {hasTrend ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradientLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1677ff" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#1677ff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5edf7" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#e5edf7' }}
                tickLine={{ stroke: '#e5edf7' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#e5edf7' }}
                tickLine={{ stroke: '#e5edf7' }}
              />
              <Tooltip content={<LightTooltip />} />
              <Area
                type="monotone"
                dataKey="risk_score"
                stroke="#1677ff"
                strokeWidth={2}
                fill="url(#riskGradientLight)"
                dot={{ r: 3, fill: '#1677ff' }}
                activeDot={{ r: 5, fill: '#1677ff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Typography.Text style={{ color: '#64748b', display: 'block', paddingTop: 80, textAlign: 'center' }}>
            暂无审计数据，请先运行攻击演示或 Agent 对话
          </Typography.Text>
        )}
      </div>

      <div style={{ ...CHART_CARD_STYLE, flex: '1 1 36%', minWidth: 240 }}>
        <div style={TITLE_STYLE}>风险分布</div>
        <div style={SUBTITLE_STYLE}>按 risk_level 统计最近审计日志</div>
        {hasDist ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskDistData.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: '#94a3b8' }}
              >
                {riskDistData
                  .filter((d) => d.value > 0)
                  .map((entry) => (
                    <Cell key={entry.key} fill={getRiskColor(entry.key)} />
                  ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e6f0ff',
                  borderRadius: 8,
                  color: '#1f2937',
                  boxShadow: '0 4px 12px rgba(15, 35, 70, 0.08)',
                }}
              />
              <Legend wrapperStyle={{ color: '#475569', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Typography.Text style={{ color: '#64748b', display: 'block', paddingTop: 80, textAlign: 'center' }}>
            暂无风险分布数据
          </Typography.Text>
        )}
      </div>
    </div>
  )
}
