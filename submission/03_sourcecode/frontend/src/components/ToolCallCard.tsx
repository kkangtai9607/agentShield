import { Card, Typography } from 'antd'
import { getToolLabel } from '../utils/displayMaps'

export default function ToolCallCard({
  toolName,
  toolArgs,
}: {
  toolName: string
  toolArgs: Record<string, unknown>
}) {
  return (
    <Card size="small" title={`工具: ${getToolLabel(toolName)}`} style={{ marginBottom: 8 }}>
      <Typography.Text type="secondary">参数:</Typography.Text>
      <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(toolArgs, null, 2)}
      </pre>
    </Card>
  )
}
