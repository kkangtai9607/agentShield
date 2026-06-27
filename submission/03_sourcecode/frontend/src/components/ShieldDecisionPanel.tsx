import { useState } from 'react'

import { Button, Card, Modal, Space, Tag, Typography } from 'antd'

import type { ShieldDecision } from '../api/client'

import { api } from '../api/client'

import ManualConfirmActions from './ManualConfirmActions'

import RiskTag from './RiskTag'

import {

  CARD_STYLE,

  DECISION_COLORS,

  DECISION_LABELS,

  type ManualConfirmState,

  detectSensitiveTypes,

  getDecisionKey,

  maskSensitiveText,

} from '../utils/chat'

import { getToolLabel } from '../utils/displayMaps'



interface ShieldDecisionPanelProps {

  decisions: ShieldDecision[]

  manualConfirmState: ManualConfirmState

  onConfirmAction?: (

    key: string,

    status: 'confirmed' | 'cancelled',

    resultMessage?: string,

    updatedDecision?: ShieldDecision,

  ) => void

  onConfirmRequest: (

    key: string,

    auditId: number | undefined,

    approved: boolean,

    onUpdate?: (

      key: string,

      status: 'confirmed' | 'cancelled',

      resultMessage?: string,

      updatedDecision?: ShieldDecision,

    ) => void,

  ) => Promise<void>

}



export default function ShieldDecisionPanel({

  decisions,

  manualConfirmState,

  onConfirmAction,

  onConfirmRequest,

}: ShieldDecisionPanelProps) {

  const [auditModal, setAuditModal] = useState<{

    open: boolean

    loading: boolean

    data: Record<string, unknown> | null

  }>({

    open: false,

    loading: false,

    data: null,

  })



  const openAudit = async (auditId?: number) => {

    if (!auditId) return

    setAuditModal({ open: true, loading: true, data: null })

    try {

      const res = await api.auditLog(auditId)

      setAuditModal({

        open: true,

        loading: false,

        data: res.data as unknown as Record<string, unknown>,

      })

    } catch {

      setAuditModal({ open: false, loading: false, data: null })

    }

  }



  if (decisions.length === 0) {

    return (

      <Card title="AgentShield 决策" style={CARD_STYLE}>

        <Typography.Text type="secondary">无决策数据</Typography.Text>

      </Card>

    )

  }



  return (

    <>

      <Card title="AgentShield 决策" style={CARD_STYLE}>

        {decisions.map((d, i) => {

          const key = getDecisionKey(d, i)

          const dec = d.decision

          const borderColor = DECISION_COLORS[dec] ?? '#1677ff'

          const label = DECISION_LABELS[dec] ?? dec

          const preview = maskSensitiveText(d.result_preview || '')

          const sensitiveTypes = detectSensitiveTypes(d.result_preview || d.reason || '')

          const manualState = manualConfirmState[key]



          return (

            <Card

              key={key}

              size="small"

              style={{

                marginBottom: 12,

                borderLeft: `4px solid ${borderColor}`,

                background: '#fff',

              }}

              title={getToolLabel(d.tool_name)}

            >

              <Space wrap style={{ marginBottom: 8 }}>

                <RiskTag level={d.risk_level} score={d.risk_score} />

                <Tag

                  color={

                    dec === 'block'

                      ? 'error'

                      : dec === 'mask'

                        ? 'processing'

                        : dec === 'confirm'

                          ? 'warning'

                          : 'success'

                  }

                >

                  {label}

                </Tag>

                {d.executed && <Tag color="blue">已执行</Tag>}

                {d.audit_id && <Tag>审计 #{d.audit_id}</Tag>}

              </Space>



              <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>

                原因：{maskSensitiveText(d.reason)}

              </Typography.Paragraph>



              {preview && (

                <Typography.Paragraph style={{ fontSize: 12, marginBottom: 4 }}>

                  结果预览：{preview}

                </Typography.Paragraph>

              )}



              {(dec === 'mask' || sensitiveTypes.length > 0) && (

                <div style={{ marginTop: 8, padding: 8, background: '#f0f5ff', borderRadius: 6 }}>

                  <Typography.Text strong style={{ fontSize: 12 }}>脱敏结果</Typography.Text>

                  {sensitiveTypes.length > 0 && (

                    <div style={{ marginTop: 4 }}>

                      检测到：{sensitiveTypes.map((t) => <Tag key={t} color="blue">{t}</Tag>)}

                    </div>

                  )}

                </div>

              )}



              <ManualConfirmActions

                decision={d}

                manualState={manualState}

                onConfirm={(approved) =>

                  onConfirmRequest(key, d.audit_id, approved, onConfirmAction)

                }

              />



              {d.audit_id && (

                <Button

                  type="link"

                  size="small"

                  style={{ marginTop: 4 }}

                  onClick={() => openAudit(d.audit_id)}

                >

                  查看审计详情

                </Button>

              )}

            </Card>

          )

        })}

      </Card>



      <Modal

        title="审计详情"

        open={auditModal.open}

        onCancel={() => setAuditModal({ open: false, loading: false, data: null })}

        footer={null}

        width={640}

      >

        {auditModal.loading ? (

          <Typography.Text>加载中…</Typography.Text>

        ) : (

          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 400, overflow: 'auto' }}>

            {auditModal.data ? JSON.stringify(auditModal.data, null, 2) : '无数据'}

          </pre>

        )}

      </Modal>

    </>

  )

}


