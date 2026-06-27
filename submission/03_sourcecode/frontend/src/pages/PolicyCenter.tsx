import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CloseOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import DecisionThreshold from '../components/DecisionThreshold'
import PolicyRuleTag from '../components/PolicyRuleTag'
import PolicySectionCard from '../components/PolicySectionCard'
import PolicyStringListEditor from '../components/PolicyStringListEditor'
import PolicyThresholdEditor from '../components/PolicyThresholdEditor'
import { getPolicies, reloadPolicies, savePolicies } from '../api/client'
import { useProfile } from '../context/ProfileContext'
import {
  asRecord,
  asStringArray,
  buildThresholds,
  getPermTag,
  getPolicyOverview,
  getRiskMeta,
  getToolDesc,
  asStringMap,
  type PolicyData,
  SECTION_CARD_STYLE,
} from '../utils/policy'
import { getToolLabel } from '../utils/displayMaps'

const TOOL_COLUMNS = ['read_file', 'query_db', 'send_email', 'run_shell', 'browser_mock']
const PERM_OPTIONS = [
  { value: 'allow', label: '允许' },
  { value: 'deny', label: '禁止' },
  { value: 'confirm', label: '确认' },
]

function clonePolicy(data: PolicyData): PolicyData {
  return JSON.parse(JSON.stringify(data)) as PolicyData
}

export default function PolicyCenter() {
  const {
    profiles,
    activeProfile,
    profileName,
    profileDescription,
    switchProfile,
    formatRole,
    loading: profileLoading,
  } = useProfile()
  const [policy, setPolicy] = useState<PolicyData | null>(null)
  const [draft, setDraft] = useState<PolicyData | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState(false)

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === activeProfile) return
    if (editing) {
      message.warning('请先保存或取消编辑，再切换场景')
      return
    }
    setSwitching(true)
    try {
      await switchProfile(profileId)
      const data = await getPolicies()
      setPolicy(data)
      setDraft(clonePolicy(data))
      message.success('已切换策略场景包')
    } catch {
      message.error('场景切换失败')
    } finally {
      setSwitching(false)
    }
  }

  const activePolicy = editing ? draft : policy

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPolicies()
      setPolicy(data)
      if (!editing) setDraft(clonePolicy(data))
    } catch (e) {
      console.error('load policies failed', e)
      message.error('策略加载失败')
    } finally {
      setLoading(false)
    }
  }, [editing])

  useEffect(() => {
    load()
  }, [load])

  const handleReload = async () => {
    setReloading(true)
    try {
      await reloadPolicies()
      const data = await getPolicies()
      setPolicy(data)
      setDraft(clonePolicy(data))
      setEditing(false)
      message.success('策略已重新加载')
    } catch (e) {
      console.error('reload policies failed', e)
      message.error('策略重新加载失败，请检查 default_policy.yaml')
    } finally {
      setReloading(false)
    }
  }

  const startEdit = () => {
    if (policy) {
      setDraft(clonePolicy(policy))
      setEditing(true)
    }
  }

  const cancelEdit = () => {
    if (policy) setDraft(clonePolicy(policy))
    setEditing(false)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const saved = await savePolicies(draft)
      setPolicy(saved)
      setDraft(clonePolicy(saved))
      setEditing(false)
      message.success('策略已保存并生效')
    } catch (e) {
      console.error('save policies failed', e)
      message.error('策略保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateDraftList = (key: keyof PolicyData, value: string[]) => {
    setDraft((prev) => ({ ...(prev ?? {}), [key]: value }))
  }

  const updateRolePerm = (role: string, tool: string, perm: string) => {
    setDraft((prev) => {
      const roles = asRecord(prev?.role_permissions)
      const next = { ...roles, [role]: { ...roles[role], [tool]: perm } }
      return { ...(prev ?? {}), role_permissions: next }
    })
  }

  const updateThreshold = (key: string, field: 'min' | 'max', value: number) => {
    setDraft((prev) => {
      const thresholds = { ...(prev?.decision_thresholds as Record<string, Record<string, unknown>>) }
      const item = { ...(thresholds[key] ?? {}) }
      item[field] = value
      thresholds[key] = item
      return { ...(prev ?? {}), decision_thresholds: thresholds }
    })
  }

  const rolePerms = asRecord(activePolicy?.role_permissions)
  const toolRisks = asStringMap(activePolicy?.tool_risk_level)
  const sensitivePaths = asStringArray(activePolicy?.sensitive_paths)
  const shellPatterns = asStringArray(activePolicy?.dangerous_shell_patterns)
  const sqlPatterns = asStringArray(activePolicy?.dangerous_sql_patterns)
  const injectionPatterns = asStringArray(activePolicy?.prompt_injection_patterns)
  const thresholds = buildThresholds(activePolicy?.decision_thresholds)
  const overview = activePolicy ? getPolicyOverview(activePolicy) : null

  const roleTableData = Object.entries(rolePerms).map(([role, perms]) => ({
    key: role,
    role,
    ...perms,
  }))

  const roleColumns = useMemo(
    () => [
      {
        title: '身份',
        dataIndex: 'role',
        key: 'role',
        width: 100,
        render: (role: string) => (
          <Typography.Text strong>{formatRole(role)}</Typography.Text>
        ),
      },
      ...TOOL_COLUMNS.map((tool) => ({
        title: getToolLabel(tool),
        dataIndex: tool,
        key: tool,
        render: (perm: string | undefined, record: { role: string }) => {
          if (editing) {
            return (
              <Select
                size="small"
                style={{ width: 88 }}
                value={perm ?? 'deny'}
                options={PERM_OPTIONS}
                onChange={(v) => updateRolePerm(record.role, tool, v)}
              />
            )
          }
          const meta = getPermTag(perm)
          return <Tag color={meta.color}>{meta.text}</Tag>
        },
      })),
    ],
    [editing, draft, formatRole],
  )

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            策略中心
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            竞赛演示可切换场景包；<strong>真实接入你的业务</strong>请用侧栏「快速集成」+ <code>POLICY_FILE</code>。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Select
            style={{ minWidth: 200 }}
            value={activeProfile}
            loading={switching || profileLoading}
            placeholder="选择场景策略包"
            notFoundContent={profileLoading ? '加载中…' : '暂无场景'}
            onChange={handleSwitchProfile}
            options={profiles.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          {editing ? (
            <>
              <Button icon={<CloseOutlined />} onClick={cancelEdit}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存策略
              </Button>
            </>
          ) : (
            <>
              <Button icon={<EditOutlined />} type="primary" onClick={startEdit}>
                编辑策略
              </Button>
              <Button
                icon={<ReloadOutlined />}
                loading={reloading}
                onClick={handleReload}
              >
                从文件重载
              </Button>
            </>
          )}
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={`竞赛演示场景：${profileName}`}
        description={profileDescription || '答辩时可切换校园/个人/企业。接入自有 Agent 请见「快速集成」页，使用 user_policy.template.yaml + POLICY_FILE。'}
      />

      {editing && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="编辑模式"
          description="修改后点击「保存策略」将写入当前场景 YAML（profiles/{场景}.yaml）并立即生效。"
        />
      )}

      {overview && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {[
            { label: '角色数量', value: overview.roleCount },
            { label: '工具数量', value: overview.toolCount },
            { label: '敏感路径规则', value: overview.sensitivePathCount },
            { label: '危险命令规则', value: overview.shellRuleCount },
            { label: '提示注入规则', value: overview.injectionRuleCount },
          ].map((item) => (
            <Col xs={12} sm={8} md={4} key={item.label}>
              <Card style={SECTION_CARD_STYLE} styles={{ body: { padding: '16px 20px' } }}>
                <Typography.Text type="secondary">{item.label}</Typography.Text>
                <Typography.Title level={3} style={{ margin: '4px 0 0' }}>
                  {item.value}
                </Typography.Title>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <PolicySectionCard
        title="身份工具权限"
        description="不同身份对各类工具的默认访问策略。deny 将直接阻断，confirm 需人工确认后执行。"
        loading={loading}
      >
        {roleTableData.length > 0 ? (
          <Table
            dataSource={roleTableData}
            columns={roleColumns}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Typography.Text type="secondary">暂无配置</Typography.Text>
        )}
      </PolicySectionCard>

      <PolicySectionCard title="工具风险等级" loading={loading}>
        {Object.keys(toolRisks).length > 0 ? (
          <Row gutter={[16, 16]}>
            {Object.entries(toolRisks).map(([tool, level]) => {
              const meta = getRiskMeta(level)
              return (
                <Col xs={24} sm={12} md={8} key={tool}>
                  <Card
                    size="small"
                    style={{
                      border: '1px solid #e6f0ff',
                      borderRadius: 10,
                      background: '#f7fbff',
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>{getToolLabel(tool)}</Typography.Text>
                      <Tag color={meta.color}>{meta.text}</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {getToolDesc(tool)}
                      </Typography.Text>
                    </Space>
                  </Card>
                </Col>
              )
            })}
          </Row>
        ) : (
          <Typography.Text type="secondary">暂无配置</Typography.Text>
        )}
      </PolicySectionCard>

      <Row gutter={20}>
        <Col xs={24} lg={12}>
          <PolicySectionCard
            title="敏感路径规则"
            description="命中以下路径或关键词时，AgentShield 将提高风险等级或阻断读取。"
            loading={loading}
          >
            {editing ? (
              <PolicyStringListEditor
                value={sensitivePaths}
                onChange={(v) => updateDraftList('sensitive_paths', v)}
                placeholder="如 secret、.env"
                tagColor="red"
              />
            ) : sensitivePaths.length > 0 ? (
              <Space wrap>
                {sensitivePaths.map((p) => (
                  <PolicyRuleTag key={p} color="#cf1322">{p}</PolicyRuleTag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">暂无配置</Typography.Text>
            )}
          </PolicySectionCard>
        </Col>
        <Col xs={24} lg={12}>
          <PolicySectionCard
            title="危险命令规则"
            description="命中以下命令模式时，run_shell 将被阻断或要求人工确认。"
            loading={loading}
          >
            {editing ? (
              <PolicyStringListEditor
                value={shellPatterns}
                onChange={(v) => updateDraftList('dangerous_shell_patterns', v)}
                placeholder="如 rm -rf"
                tagColor="red"
                mono
              />
            ) : shellPatterns.length > 0 ? (
              <Space wrap>
                {shellPatterns.map((p) => (
                  <PolicyRuleTag key={p} color="red" mono>{p}</PolicyRuleTag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">暂无配置</Typography.Text>
            )}
          </PolicySectionCard>
        </Col>
      </Row>

      <PolicySectionCard title="危险 SQL 规则" loading={loading}>
        {editing ? (
          <PolicyStringListEditor
            value={sqlPatterns}
            onChange={(v) => updateDraftList('dangerous_sql_patterns', v)}
            placeholder="如 SELECT * FROM"
            tagColor="volcano"
            mono
          />
        ) : sqlPatterns.length > 0 ? (
          <Space wrap>
            {sqlPatterns.map((p) => (
              <PolicyRuleTag key={p} color="volcano" mono>{p}</PolicyRuleTag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">暂无配置</Typography.Text>
        )}
      </PolicySectionCard>

      <PolicySectionCard title="提示注入检测规则" loading={loading}>
        {editing ? (
          <PolicyStringListEditor
            value={injectionPatterns}
            onChange={(v) => updateDraftList('prompt_injection_patterns', v)}
            placeholder="如 ignore previous instructions"
            tagColor="orange"
          />
        ) : injectionPatterns.length > 0 ? (
          <Space wrap>
            {injectionPatterns.map((p) => (
              <PolicyRuleTag key={p} color="orange" icon="⚠️">{p}</PolicyRuleTag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">暂无配置</Typography.Text>
        )}
      </PolicySectionCard>

      <PolicySectionCard
        title="风险决策阈值"
        description="根据风险分数映射 allow / mask / confirm / block。"
        loading={loading}
      >
        {editing ? (
          <PolicyThresholdEditor thresholds={thresholds} onChange={updateThreshold} />
        ) : (
          <DecisionThreshold thresholds={thresholds} />
        )}
      </PolicySectionCard>

      <Collapse
        style={{ marginBottom: 24, borderRadius: 12, border: '1px solid #e6f0ff' }}
        items={[
          {
            key: 'raw',
            label: <Typography.Text strong>原始策略配置（JSON）</Typography.Text>,
            children: (
              <pre
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  maxHeight: 360,
                  overflow: 'auto',
                  fontSize: 13,
                  padding: 16,
                  margin: 0,
                }}
              >
                {activePolicy ? JSON.stringify(activePolicy, null, 2) : '暂无配置'}
              </pre>
            ),
          },
        ]}
      />
    </div>
  )
}
