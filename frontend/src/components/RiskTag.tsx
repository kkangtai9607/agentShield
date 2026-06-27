import { Tag } from 'antd'

const LEVEL_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: '#a8071a',
}

const LEVEL_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
}

export default function RiskTag({ level, score }: { level: string; score?: number }) {
  return (
    <Tag color={LEVEL_COLORS[level] || 'default'}>
      {LEVEL_LABELS[level] || level}{score !== undefined ? ` (${score})` : ''}
    </Tag>
  )
}
