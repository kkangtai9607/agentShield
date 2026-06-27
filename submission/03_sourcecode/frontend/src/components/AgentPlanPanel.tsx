import { Card, Typography } from 'antd'
import { CARD_STYLE } from '../utils/chat'
import { getToolLabel } from '../utils/displayMaps'

interface ToolCall {
  tool_name: string
  tool_args: Record<string, unknown>
}

interface AgentPlanPanelProps {
  thought: string
  toolCalls: ToolCall[]
}

export default function AgentPlanPanel({ thought, toolCalls }: AgentPlanPanelProps) {
  return (
    <Card title="Agent 原始计划" style={CARD_STYLE}>
      <Typography.Paragraph>
        <Typography.Text type="secondary">思考：</Typography.Text>
        {thought || '无'}
      </Typography.Paragraph>
      {toolCalls.length === 0 ? (
        <Typography.Text type="secondary">无工具调用</Typography.Text>
      ) : (
        toolCalls.map((tc, i) => (
          <Card
            key={`${tc.tool_name}-${i}`}
            size="small"
            style={{ marginBottom: 8, background: '#fafafa' }}
            title={`工具 #${i + 1}：${getToolLabel(tc.tool_name)}`}
          >
            <Typography.Text type="secondary">参数：</Typography.Text>
            <pre
              style={{
                margin: '8px 0 0',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                background: '#fafafa',
                padding: 8,
                borderRadius: 6,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(tc.tool_args, null, 2)}
            </pre>
          </Card>
        ))
      )}
    </Card>
  )
}
