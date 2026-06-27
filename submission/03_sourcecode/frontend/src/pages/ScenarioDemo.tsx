import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { api, ShieldDecision } from '../api/client'
import DecisionCard from '../components/DecisionCard'
import { getDecisionLabel } from '../utils/displayMaps'

interface ScenarioInfo {
  id: string
  name: string
  description: string
}

interface ScenarioResult {
  scenario_id: string
  scenario_name: string
  user_request: string
  agent_plan: string
  original_tool_calls: Array<{ tool_name: string; tool_args: Record<string, unknown> }>
  risk_points: string[]
  shield_decisions: ShieldDecision[]
  audit_ids: number[]
  final_decision: string
  polluted_content_preview?: string
  masked_content_preview?: string
}

function AuditLink({ id }: { id: number }) {
  return (
    <Link to={`/audit?id=${id}`}>
      <Tag color="blue" style={{ cursor: 'pointer' }}>
        审计 #{id} →
      </Tag>
    </Link>
  )
}

export default function ScenarioDemo() {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])
  const [results, setResults] = useState<Record<string, ScenarioResult>>({})
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    api.scenarios().then((res) => setScenarios(res.data))
  }, [])

  const runScenario = async (id: string) => {
    setLoading(id)
    try {
      const res = await api.runScenario(id)
      setResults((prev) => ({ ...prev, [id]: res.data as ScenarioResult }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <Typography.Title level={3}>攻击场景演示</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        运行内置攻击剧本后，可点击审计标签跳转至审计中心查看完整记录。
      </Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {scenarios.map((s) => (
          <Col xs={24} md={12} key={s.id}>
            <Card
              title={s.name}
              extra={
                <Button
                  type="primary"
                  size="small"
                  loading={loading === s.id}
                  onClick={() => runScenario(s.id)}
                >
                  运行演示
                </Button>
              }
            >
              <Typography.Paragraph type="secondary">{s.description}</Typography.Paragraph>
              {results[s.id] && (
                <div>
                  <Typography.Text strong>用户请求: </Typography.Text>
                  <Typography.Text>{results[s.id].user_request}</Typography.Text>
                  <br />
                  <Typography.Text strong>Agent 计划: </Typography.Text>
                  <Typography.Text>{results[s.id].agent_plan}</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text strong>风险识别点:</Typography.Text>
                    <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                      {results[s.id].risk_points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <Space wrap style={{ marginTop: 8, marginBottom: 8 }}>
                    <Tag color={results[s.id].final_decision === 'block' ? 'error' : 'warning'}>
                      最终决策: {getDecisionLabel(results[s.id].final_decision)}
                    </Tag>
                    <Typography.Text type="secondary">审计记录:</Typography.Text>
                    {results[s.id].audit_ids?.map((id) => (
                      <AuditLink key={id} id={id} />
                    ))}
                  </Space>
                  {results[s.id].polluted_content_preview && (
                    <Typography.Paragraph style={{ fontSize: 12 }}>
                      <Typography.Text strong>污染内容预览: </Typography.Text>
                      {results[s.id].polluted_content_preview}
                    </Typography.Paragraph>
                  )}
                  {results[s.id].masked_content_preview && (
                    <Typography.Paragraph style={{ fontSize: 12 }}>
                      <Typography.Text strong>脱敏后预览: </Typography.Text>
                      {results[s.id].masked_content_preview}
                    </Typography.Paragraph>
                  )}
                  {results[s.id].shield_decisions?.map((d, i) => (
                    <div key={i}>
                      <DecisionCard decision={d} />
                      {d.audit_id && (
                        <div style={{ marginTop: -4, marginBottom: 8, paddingLeft: 4 }}>
                          <AuditLink id={d.audit_id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
