import { resolveRoleLabel } from './roleLabels'

export type PolicyData = Record<string, unknown>

export interface DecisionThresholdItem {
  key: string
  min: number
  max: number
  decision: string
  label: string
}

const PERM_LABELS: Record<string, { text: string; color: string }> = {
  allow: { text: '允许', color: 'success' },
  deny: { text: '禁止', color: 'error' },
  confirm: { text: '确认', color: 'warning' },
  mask: { text: '脱敏', color: 'processing' },
}

const RISK_LABELS: Record<string, { text: string; color: string }> = {
  low: { text: '低风险', color: 'green' },
  medium: { text: '中风险', color: 'orange' },
  high: { text: '高风险', color: 'red' },
  critical: { text: '严重风险', color: '#a8071a' },
}

const TOOL_DESC: Record<string, string> = {
  read_file: '文件读取工具，可能涉及敏感路径或密钥文件。',
  query_db: '数据库查询工具，可能涉及隐私字段或越权查询。',
  send_email: '邮件外发工具，可能造成数据泄露。',
  run_shell: '终端命令工具，可能造成系统破坏。',
  browser_mock: '网页浏览模拟工具，可能返回污染内容。',
}

const THRESHOLD_META: Record<string, { label: string; decisionText: string; color: string }> = {
  low: { label: '低风险', decisionText: '放行', color: '#52c41a' },
  medium: { label: '中风险', decisionText: '脱敏', color: '#1677ff' },
  high: { label: '高风险', decisionText: '人工确认', color: '#fa8c16' },
  critical: { label: '严重风险', decisionText: '阻断', color: '#cf1322' },
}

const DECISION_COLORS: Record<string, string> = {
  allow: '#52c41a',
  mask: '#1677ff',
  confirm: '#fa8c16',
  block: '#cf1322',
}

export function extractPolicy(raw: unknown): PolicyData {
  if (!raw || typeof raw !== 'object') return {}
  const data = raw as Record<string, unknown>
  if (data.policy && typeof data.policy === 'object') {
    return data.policy as PolicyData
  }
  return data as PolicyData
}

export function getRoleLabel(role: string): string {
  return resolveRoleLabel(role)
}

export function getPermTag(perm: string | undefined | null) {
  if (!perm) return { text: '未配置', color: 'default' }
  return PERM_LABELS[perm] ?? { text: '未配置', color: 'default' }
}

export function getRiskMeta(level: string) {
  return RISK_LABELS[level] ?? { text: level, color: 'default' }
}

export function getToolDesc(tool: string): string {
  return TOOL_DESC[tool] ?? '工具调用需经过 AgentShield 安全评估。'
}

export function getThresholdMeta(key: string) {
  return THRESHOLD_META[key] ?? { label: key, decisionText: key, color: '#64748b' }
}

export function getDecisionColor(decision: string): string {
  return DECISION_COLORS[decision] ?? '#64748b'
}

export function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return value as Record<string, string>
}

export function asRecord(value: unknown): Record<string, Record<string, string>> {
  if (!value || typeof value !== 'object') return {}
  return value as Record<string, Record<string, string>>
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String)
}

export function buildThresholds(value: unknown): DecisionThresholdItem[] {
  if (!value || typeof value !== 'object') return []
  const obj = value as Record<string, Record<string, unknown>>
  return Object.entries(obj).map(([key, item]) => ({
    key,
    min: Number(item?.min ?? 0),
    max: Number(item?.max ?? 0),
    decision: String(item?.decision ?? ''),
    label: THRESHOLD_META[key]?.label ?? key,
  }))
}

export function getPolicyOverview(policy: PolicyData) {
  const roles = asRecord(policy.role_permissions)
  const tools = asStringMap(policy.tool_risk_level)
  return {
    roleCount: Object.keys(roles).length,
    toolCount: Object.keys(tools).length,
    sensitivePathCount: asStringArray(policy.sensitive_paths).length,
    shellRuleCount: asStringArray(policy.dangerous_shell_patterns).length,
    sqlRuleCount: asStringArray(policy.dangerous_sql_patterns).length,
    injectionRuleCount: asStringArray(policy.prompt_injection_patterns).length,
  }
}

export const SECTION_CARD_STYLE = {
  borderRadius: 12,
  border: '1px solid #e6f0ff',
  boxShadow: '0 8px 24px rgba(15, 35, 70, 0.06)',
  marginBottom: 20,
} as const
