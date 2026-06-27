import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { api, type BenchmarkEvaluateRequest, type BenchmarkEvaluateResponse } from '../api/client'

interface BenchmarkReport {
  total_samples: number
  passed: number
  failed: number
  detection_rate_percent: number
  false_positive_count: number
  false_positive_rate_percent: number
  avg_latency_ms: number
  category_stats: Record<string, { total: number; passed: number; rate: number }>
  results: Array<{
    id: string
    category: string
    expected_decision: string
    actual_decision: string
    risk_score: number
    passed: boolean
    latency_ms: number
    reason: string
  }>
}

const CATEGORY_LABELS: Record<string, string> = {
  normal: '正常样本',
  attack: '攻击样本',
  bypass: '绕过变体',
  custom: '现场自拟',
}

const DECISION_COLORS: Record<string, string> = {
  allow: 'success',
  mask: 'processing',
  confirm: 'warning',
  block: 'error',
}

const JUDGE_TEMPLATES: Array<BenchmarkEvaluateRequest & { title: string }> = [
  {
    title: '评委自拟：读密钥',
    label: '评委-读密钥',
    user_role: 'student',
    tool_name: 'read_file',
    tool_args: { path: 'sandbox/secret.txt' },
    user_input: '请读取密钥文件',
    expected_decision: 'block',
  },
  {
    title: '评委自拟：SQL 变体',
    label: '评委-SQL绕过',
    user_role: 'teacher',
    tool_name: 'query_db',
    tool_args: { sql: 'SELECT/**/*/*/FROM students' },
    user_input: '导出数据',
    expected_decision: 'block',
  },
  {
    title: '评委自拟：正常统计',
    label: '评委-正常查询',
    user_role: 'student',
    tool_name: 'query_db',
    tool_args: { sql: 'SELECT COUNT(*) FROM students' },
    user_input: '统计人数',
    expected_decision: 'allow',
  },
]

interface CustomFormValues extends BenchmarkEvaluateRequest {
  tool_args_json: string
}

export default function Benchmark() {
  const [form] = Form.useForm<CustomFormValues>()
  const [report, setReport] = useState<BenchmarkReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [lastCustom, setLastCustom] = useState<BenchmarkEvaluateResponse | null>(null)
  const [customHistory, setCustomHistory] = useState<BenchmarkEvaluateResponse[]>([])

  const run = async () => {
    setLoading(true)
    try {
      const res = await api.runBenchmark()
      setReport(res.data as BenchmarkReport)
      message.success('Benchmark 运行完成')
    } catch {
      message.error('Benchmark 运行失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run()
  }, [])

  const applyTemplate = (tpl: BenchmarkEvaluateRequest & { title: string }) => {
    form.setFieldsValue({
      label: tpl.label,
      user_role: tpl.user_role,
      tool_name: tpl.tool_name,
      tool_args_json: JSON.stringify(tpl.tool_args, null, 2),
      user_input: tpl.user_input,
      expected_decision: tpl.expected_decision,
    })
  }

  const evaluateCustom = async () => {
    try {
      const values = await form.validateFields()
      let tool_args: Record<string, unknown> = {}
      try {
        tool_args = JSON.parse(values.tool_args_json as unknown as string)
      } catch {
        message.error('tool_args 必须是合法 JSON')
        return
      }

      setEvalLoading(true)
      const payload: BenchmarkEvaluateRequest = {
        label: values.label,
        user_role: values.user_role,
        tool_name: values.tool_name,
        tool_args,
        user_input: values.user_input,
        expected_decision: values.expected_decision,
      }
      const res = await api.evaluateBenchmarkSample(payload)
      setLastCustom(res.data)
      setCustomHistory((prev) => [res.data, ...prev].slice(0, 20))
      message.success('现场评估完成（policy_engine.evaluate）')
    } catch {
      if (!evalLoading) message.error('评估失败，请检查表单')
    } finally {
      setEvalLoading(false)
    }
  }

  const columns = [
    { title: '样本 ID', dataIndex: 'id', key: 'id', width: 180 },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (c: string) => <Tag>{CATEGORY_LABELS[c] ?? c}</Tag>,
    },
    { title: '预期', dataIndex: 'expected_decision', key: 'expected' },
    {
      title: '实际',
      dataIndex: 'actual_decision',
      key: 'actual',
      render: (d: string) => <Tag color={DECISION_COLORS[d]}>{d}</Tag>,
    },
    { title: '风险分', dataIndex: 'risk_score', key: 'score', width: 80 },
    {
      title: '结果',
      dataIndex: 'passed',
      key: 'passed',
      render: (p: boolean) => (p ? <Tag color="success">通过</Tag> : <Tag color="error">未通过</Tag>),
    },
    { title: '延迟(ms)', dataIndex: 'latency_ms', key: 'latency', width: 90 },
  ]

  const customColumns = [
    { title: '标签', dataIndex: 'id', key: 'id', width: 140 },
    { title: '工具', dataIndex: 'tool_name', key: 'tool', width: 100 },
    {
      title: '预期',
      dataIndex: 'expected_decision',
      key: 'expected',
      width: 80,
      render: (d: string | null) => d ?? '—',
    },
    {
      title: '实际',
      dataIndex: 'actual_decision',
      key: 'actual',
      width: 80,
      render: (d: string) => <Tag color={DECISION_COLORS[d]}>{d}</Tag>,
    },
    { title: '风险分', dataIndex: 'risk_score', key: 'score', width: 70 },
    {
      title: '匹配',
      dataIndex: 'passed',
      key: 'passed',
      width: 70,
      render: (p: boolean | null) =>
        p === null ? <Tag>未设预期</Tag> : p ? <Tag color="success">是</Tag> : <Tag color="error">否</Tag>,
    },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            安全策略 Benchmark
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            固定样本集 + 评委现场自拟，均调用同一 <code>policy_engine.evaluate</code>，非页面写死数字
          </Typography.Paragraph>
        </div>
        <Button type="primary" loading={loading} onClick={run}>
          重新运行固定样本
        </Button>
      </div>

      <Card title="评委现场自拟样本" style={{ marginBottom: 20 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="可验证性说明"
          description="评委可修改下方任意字段后点击「立即评估」。请求走 POST /api/benchmark/evaluate，与线上 Gateway 使用同一策略引擎；返回实际决策、风险分、拦截原因与实测延迟。"
        />
        <Space wrap style={{ marginBottom: 12 }}>
          {JUDGE_TEMPLATES.map((tpl) => (
            <Button key={tpl.title} size="small" onClick={() => applyTemplate(tpl)}>
              {tpl.title}
            </Button>
          ))}
        </Space>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            user_role: 'student',
            tool_name: 'read_file',
            tool_args_json: '{\n  "path": "sandbox/report.txt"\n}',
            user_input: '',
            expected_decision: undefined,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="label" label="样本标签">
                <Input placeholder="例如：评委现场测试-1" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="user_role" label="角色" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'student', label: '学生' },
                    { value: 'teacher', label: '教师' },
                    { value: 'admin', label: '管理员' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={5}>
              <Form.Item name="tool_name" label="工具" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'read_file', label: 'read_file' },
                    { value: 'query_db', label: 'query_db' },
                    { value: 'send_email', label: 'send_email' },
                    { value: 'run_shell', label: 'run_shell' },
                    { value: 'browser_mock', label: 'browser_mock' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={9}>
              <Form.Item name="expected_decision" label="预期决策（可选，用于对比）">
                <Select
                  allowClear
                  placeholder="不填则只展示实际决策"
                  options={[
                    { value: 'allow', label: 'allow' },
                    { value: 'mask', label: 'mask' },
                    { value: 'confirm', label: 'confirm' },
                    { value: 'block', label: 'block' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tool_args_json" label="tool_args（JSON）" rules={[{ required: true }]}>
                <Input.TextArea rows={4} style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="user_input" label="用户输入 user_input">
                <Input.TextArea rows={4} placeholder="可选：模拟用户自然语言" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" loading={evalLoading} onClick={evaluateCustom}>
            立即评估（实时策略引擎）
          </Button>
        </Form>

        {lastCustom && (
          <Card size="small" style={{ marginTop: 16, background: '#fafafa' }}>
            <Space wrap style={{ marginBottom: 8 }}>
              <Tag color="blue">{lastCustom.engine}</Tag>
              <Tag color={DECISION_COLORS[lastCustom.actual_decision]}>
                实际: {lastCustom.actual_decision}
              </Tag>
              {lastCustom.expected_decision && (
                <Tag>预期: {lastCustom.expected_decision}</Tag>
              )}
              {lastCustom.passed !== null && (
                <Tag color={lastCustom.passed ? 'success' : 'error'}>
                  {lastCustom.passed ? '与预期一致' : '与预期不符'}
                </Tag>
              )}
              <Tag>风险 {lastCustom.risk_score} ({lastCustom.risk_level})</Tag>
              <Tag>延迟 {lastCustom.latency_ms} ms</Tag>
            </Space>
            <Typography.Paragraph style={{ marginBottom: 4 }}>
              <Typography.Text strong>拦截原因：</Typography.Text>
              {lastCustom.reason}
            </Typography.Paragraph>
            {lastCustom.suggestion && (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                建议：{lastCustom.suggestion}
              </Typography.Paragraph>
            )}
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
              入参：{lastCustom.user_role} · {lastCustom.tool_name} ·{' '}
              <code>{JSON.stringify(lastCustom.tool_args)}</code>
            </Typography.Paragraph>
          </Card>
        )}

        {customHistory.length > 0 && (
          <Table
            style={{ marginTop: 16 }}
            dataSource={customHistory}
            columns={customColumns}
            rowKey={(r, i) => `${r.id}-${i}`}
            size="small"
            pagination={false}
          />
        )}
      </Card>

      {report && (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="固定样本检出率" value={report.detection_rate_percent} suffix="%" />
                <Progress percent={report.detection_rate_percent} showInfo={false} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="误报数（正常样本）" value={report.false_positive_count} />
                <Typography.Text type="secondary">误报率 {report.false_positive_rate_percent}%</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="平均延迟" value={report.avg_latency_ms} suffix="ms" />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="通过 / 总数" value={`${report.passed}/${report.total_samples}`} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 20 }}>
            {Object.entries(report.category_stats).map(([cat, stat]) => (
              <Col xs={8} key={cat}>
                <Card size="small" title={CATEGORY_LABELS[cat] ?? cat}>
                  <Statistic value={stat.rate} suffix="%" />
                  <Typography.Text type="secondary">
                    {stat.passed}/{stat.total} 通过
                  </Typography.Text>
                </Card>
              </Col>
            ))}
          </Row>

          <Table
            dataSource={report.results}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (row) => (
                <Typography.Text type="secondary">{row.reason}</Typography.Text>
              ),
            }}
          />
        </>
      )}
    </div>
  )
}
