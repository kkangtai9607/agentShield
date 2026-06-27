import { Button, Card, Col, Row, Tag, Tooltip, Typography } from 'antd'
import { CARD_STYLE } from '../utils/chat'
import type { ChatExample } from '../data/profileExamples'

const BTN_WIDTH = 160

interface ExampleRequestCardsProps {
  profileName?: string
  normalExamples: ChatExample[]
  attackExamples: ChatExample[]
  confirmExamples?: ChatExample[]
  semanticExamples?: ChatExample[]
  formatRole?: (role: string) => string
  onSelect: (ex: ChatExample) => void
}

function ExampleButton({
  ex,
  danger,
  confirm,
  formatRole,
  onSelect,
}: {
  ex: ChatExample
  danger?: boolean
  confirm?: boolean
  formatRole?: (role: string) => string
  onSelect: (ex: ChatExample) => void
}) {
  const tooltip = ex.description
    ? `${ex.message}\n（${ex.description}）`
    : ex.message

  return (
    <Tooltip title={tooltip}>
      <Button
        danger={danger}
        type={confirm ? 'primary' : 'default'}
        ghost={confirm}
        style={{ width: BTN_WIDTH, height: 'auto', padding: '4px 8px', whiteSpace: 'normal' }}
        onClick={() => onSelect(ex)}
      >
        <div>{ex.label}</div>
        {formatRole && (
          <Tag color="blue" style={{ marginTop: 4, fontSize: 10, lineHeight: '16px' }}>
            {formatRole(ex.role)}
          </Tag>
        )}
      </Button>
    </Tooltip>
  )
}

export default function ExampleRequestCards({
  profileName,
  normalExamples,
  attackExamples,
  confirmExamples = [],
  semanticExamples = [],
  formatRole,
  onSelect,
}: ExampleRequestCardsProps) {
  const sceneHint = profileName ? ` · ${profileName}` : ''

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card
            title={`正常请求${sceneHint}`}
            style={CARD_STYLE}
            styles={{ body: { minHeight: 140 } }}
          >
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              用于验证 AgentShield 正常放行低风险工具调用
            </Typography.Paragraph>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {normalExamples.map((ex) => (
                <ExampleButton key={ex.label} ex={ex} formatRole={formatRole} onSelect={onSelect} />
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={`攻击请求${sceneHint}`}
            style={CARD_STYLE}
            styles={{ body: { minHeight: 140 } }}
          >
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              用于验证敏感读取、越权查询、外发泄密和危险命令拦截
            </Typography.Paragraph>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {attackExamples.map((ex) => (
                <ExampleButton
                  key={ex.label}
                  ex={ex}
                  danger
                  formatRole={formatRole}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {confirmExamples.length > 0 && (
        <Card
          title={`人工确认示例${sceneHint}`}
          style={{ ...CARD_STYLE, borderColor: '#ffe7ba' }}
          styles={{ body: { background: '#fffbe6' } }}
        >
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            以下请求会进入「人工确认」状态：发送检测后，在右侧决策面板点击「确认执行」或「取消执行」完成闭环。
            请使用标注身份对应的演示账号登录（如 owner01 / agent01）。
          </Typography.Paragraph>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {confirmExamples.map((ex) => (
              <ExampleButton
                key={ex.label}
                ex={ex}
                confirm
                formatRole={formatRole}
                onSelect={onSelect}
              />
            ))}
          </div>
        </Card>
      )}

      {semanticExamples.length > 0 && (
        <Card
          title={`语义风险示例${sceneHint}`}
          style={{ ...CARD_STYLE, borderColor: '#d3adf7', marginBottom: 16 }}
          styles={{ body: { background: '#f9f0ff' } }}
        >
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            话术未命中固定规则时，由语义意图库（本地相似度 / 可选 LLM Judge）识别同义改写与间接攻击意图。
          </Typography.Paragraph>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {semanticExamples.map((ex) => (
              <ExampleButton
                key={ex.label}
                ex={ex}
                formatRole={formatRole}
                onSelect={onSelect}
              />
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
