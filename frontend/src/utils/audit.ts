import type { AuditLog } from '../api/client'
import {
  DECISION_LABEL_MAP,
  RISK_LEVEL_LABEL_MAP,
  ROLE_LABEL_MAP,
  TOOL_SELECT_OPTIONS,
  formatRoleDisplay,
} from './displayMaps'

export const ALERT_READ_TIME_KEY = 'agentshield_last_alert_read_time'
export const ALERT_READ_ID_KEY = 'agentshield_last_alert_read_id'

/** 兼容后端字段命名差异 */
export function normalizeAuditLog(item: Record<string, unknown>): AuditLog {
  return {
    id: Number(item.id ?? 0),
    timestamp: String(item.timestamp ?? item.time ?? item.created_at ?? ''),
    user_id: String(item.user_id ?? item.userId ?? '-'),
    user_role: String(item.user_role ?? item.userRole ?? '-'),
    session_id: String(item.session_id ?? item.sessionId ?? ''),
    user_input: String(item.user_input ?? item.userInput ?? ''),
    agent_plan: String(item.agent_plan ?? item.agentPlan ?? ''),
    tool_name: String(item.tool_name ?? item.toolName ?? '-'),
    tool_args: String(item.tool_args ?? item.toolArgs ?? ''),
    risk_score: Number(item.risk_score ?? item.riskScore ?? 0),
    risk_level: String(item.risk_level ?? item.riskLevel ?? 'low'),
    decision: String(item.decision ?? 'allow'),
    reason: String(item.reason ?? ''),
    result_preview: String(item.result_preview ?? item.resultPreview ?? ''),
  }
}

export function getLogTime(log: AuditLog | Record<string, unknown>): number {
  const raw =
    (log as AuditLog).timestamp ||
    (log as Record<string, unknown>).time ||
    (log as Record<string, unknown>).created_at
  if (!raw) return 0
  const time = new Date(String(raw)).getTime()
  return Number.isFinite(time) ? time : 0
}

export function readStoredAlertTime(): number {
  const v = localStorage.getItem(ALERT_READ_TIME_KEY)
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function readStoredAlertId(): number {
  const v = localStorage.getItem(ALERT_READ_ID_KEY)
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 预警日志：block / confirm / high / critical / score>=60 */
export function isAlertLog(log: AuditLog): boolean {
  const score = Number(log.risk_score ?? 0)
  const level = log.risk_level ?? 'low'
  return (
    log.decision === 'block' ||
    log.decision === 'confirm' ||
    level === 'high' ||
    level === 'critical' ||
    score >= 60
  )
}

export function isUnreadAlert(
  log: AuditLog,
  lastReadTime: number,
  lastReadId: number,
): boolean {
  const time = getLogTime(log)
  if (time > 0) return time > lastReadTime
  return (log.id ?? 0) > lastReadId
}

export function markAlertsAsReadInStorage(alertLogs: AuditLog[]): {
  time: number
  id: number
} {
  if (alertLogs.length === 0) {
    return { time: readStoredAlertTime(), id: readStoredAlertId() }
  }

  const times = alertLogs.map(getLogTime).filter((t) => t > 0)
  const latestTime = times.length > 0 ? Math.max(...times) : Date.now()
  const maxId = Math.max(...alertLogs.map((l) => l.id ?? 0))

  localStorage.setItem(ALERT_READ_TIME_KEY, String(latestTime))
  localStorage.setItem(ALERT_READ_ID_KEY, String(maxId))

  return { time: latestTime, id: maxId }
}

export function formatChartTime(timestamp: string): string {
  if (!timestamp) return '--'
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) {
    return timestamp.slice(11, 19) || timestamp.slice(0, 16)
  }
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function isToday(timestamp: string): boolean {
  if (!timestamp) return false
  const today = new Date().toISOString().slice(0, 10)
  return timestamp.startsWith(today) || timestamp.slice(0, 10) === today
}

export interface TrendPoint {
  time: string
  risk_score: number
  decision: string
  tool: string
}

export interface RiskDistPoint {
  name: string
  value: number
  key: string
}

const RISK_COLORS: Record<string, string> = {
  low: '#52c41a',
  medium: '#faad14',
  high: '#ff7a45',
  critical: '#cf1322',
}

export function getRiskColor(key: string): string {
  return RISK_COLORS[key] ?? '#1677ff'
}

export function buildTrendData(logs: AuditLog[], limit = 20): TrendPoint[] {
  const slice = logs.slice(0, limit)
  return slice
    .reverse()
    .map((item) => ({
      time: formatChartTime(item.timestamp),
      risk_score: Number(item.risk_score ?? 0),
      decision: item.decision ?? 'allow',
      tool: item.tool_name ?? '-',
    }))
}

export function buildRiskDistData(logs: AuditLog[]): RiskDistPoint[] {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  logs.forEach((item) => {
    const key = (item.risk_level ?? 'low') as keyof typeof counts
    if (key in counts) counts[key] += 1
    else counts.low += 1
  })
  return [
    { name: '低风险', value: counts.low, key: 'low' },
    { name: '中风险', value: counts.medium, key: 'medium' },
    { name: '高风险', value: counts.high, key: 'high' },
    { name: '严重', value: counts.critical, key: 'critical' },
  ]
}

export function truncateReason(reason: string, max = 80): string {
  if (!reason) return '-'
  return reason.length > max ? `${reason.slice(0, max)}...` : reason
}

export const CARD_STYLE = {
  borderRadius: 12,
  border: '1px solid #e6f0ff',
  boxShadow: '0 8px 24px rgba(15, 35, 70, 0.05)',
  marginBottom: 16,
} as const

export const ROLE_LABELS = ROLE_LABEL_MAP
export const RISK_LABELS = RISK_LEVEL_LABEL_MAP
export const DECISION_LABELS = DECISION_LABEL_MAP
export const TOOL_OPTIONS = TOOL_SELECT_OPTIONS.map((o) => o.value)

export const DECISION_COLORS: Record<string, string> = {
  allow: 'success',
  mask: 'processing',
  confirm: 'warning',
  block: 'error',
}

export function getField<T>(
  record: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  fallback: T,
): T {
  const v = record[snakeKey] ?? record[camelKey]
  return (v !== undefined && v !== null ? v : fallback) as T
}

export function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) {
    return timestamp.replace('T', ' ').slice(0, 19)
  }
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${mo}-${day} ${hh}:${mm}:${ss}`
}

export function formatRoleLabel(role: string): string {
  return formatRoleDisplay(role)
}

export function parseJsonSafe(raw: string | Record<string, unknown>): Record<string, unknown> | null {
  if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

export function formatToolArgsSummary(toolName: string, toolArgsRaw: string): string {
  const args = parseJsonSafe(toolArgsRaw)
  if (!args) {
    const s = toolArgsRaw || '-'
    return s.length > 80 ? s.slice(0, 80) + '...' : s
  }

  const tool = toolName.toLowerCase()
  if (tool === 'read_file' || tool.includes('read')) {
    const path = args.path ?? args.file ?? args.filepath ?? args.filename
    return path ? `路径：${path}` : JSON.stringify(args).slice(0, 80)
  }
  if (tool === 'send_email' || tool.includes('email')) {
    const to = args.to ?? args.recipient ?? args.email
    const subject = args.subject
    if (to && subject) return `收件人：${to}，主题：${String(subject).slice(0, 30)}`
    if (to) return `收件人：${to}`
    return JSON.stringify(args).slice(0, 80)
  }
  if (tool === 'query_db' || tool.includes('query') || tool.includes('db')) {
    const sql = args.sql ?? args.query
    return sql ? `SQL：${String(sql).slice(0, 60)}` : JSON.stringify(args).slice(0, 80)
  }
  if (tool === 'run_shell' || tool.includes('shell')) {
    const cmd = args.cmd ?? args.command ?? args.script
    return cmd ? `命令：${String(cmd).slice(0, 60)}` : JSON.stringify(args).slice(0, 80)
  }
  if (tool === 'browser_mock' || tool.includes('browser')) {
    const url = args.url ?? args.link
    return url ? `网址：${String(url).slice(0, 60)}` : JSON.stringify(args).slice(0, 80)
  }
  const str = JSON.stringify(args)
  return str.length > 80 ? str.slice(0, 80) + '...' : str
}

export function maskAuditSensitiveText(text: string): string {
  if (!text) return text
  let masked = text
  const patterns: Array<[RegExp, string]> = [
    [/sk-[a-zA-Z0-9]{4,}/gi, 'sk-****'],
    [/API_KEY\s*=\s*[^\s,;]+/gi, 'API_KEY=****'],
    [/password\s*[=:]\s*[^\s,;]+/gi, 'password=****'],
    [/token\s*[=:]\s*[^\s,;]+/gi, 'token=****'],
    [/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ****'],
    [/(mysql|postgresql|mongodb):\/\/[^@\s]+@/gi, '$1://****@'],
    [/DB_URL\s*=\s*[^\s]+/gi, 'DB_URL=****'],
    [/1([3-9]\d)\d{4}(\d{4})/g, '1$1****$2'],
    [/([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***@$2'],
    [/secret\.txt[^"'\\s]*/gi, 'secret.txt [已脱敏]'],
    [/\d{17}[\dXx]/g, '[MASKED_ID]'],
  ]
  for (const [re, rep] of patterns) {
    masked = masked.replace(re, rep)
  }
  return masked
}

export function parseRiskReasons(reason: string): string[] {
  if (!reason) return []
  return reason
    .split(/[;；\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export type RiskRuleType =
  | 'permission'
  | 'sensitive'
  | 'email'
  | 'injection'
  | 'shell'
  | 'sql'
  | 'pass'
  | 'default'

export function classifyRiskRule(text: string): RiskRuleType {
  const t = text.toLowerCase()
  if (t.includes('通过安全检查') || t.includes('pass')) return 'pass'
  if (t.includes('无权') || t.includes('不允许') || t.includes('角色')) return 'permission'
  if (t.includes('api_key') || t.includes('password') || t.includes('敏感') || t.includes('secret')) return 'sensitive'
  if (t.includes('邮箱') || t.includes('attacker') || t.includes('外部')) return 'email'
  if (t.includes('注入') || t.includes('injection') || t.includes('ignore')) return 'injection'
  if (t.includes('shell') || t.includes('rm -rf') || t.includes('命令') || t.includes('sudo')) return 'shell'
  if (t.includes('sql') || t.includes('select')) return 'sql'
  return 'default'
}

export const RULE_TAG_COLORS: Record<RiskRuleType, string> = {
  permission: 'red',
  sensitive: '#a8071a',
  email: 'orange',
  injection: 'purple',
  shell: 'red',
  sql: 'red',
  pass: 'green',
  default: 'default',
}

export function isHighRiskLog(log: AuditLog): boolean {
  const score = Number(log.risk_score ?? 0)
  const level = log.risk_level ?? 'low'
  return level === 'high' || level === 'critical' || score >= 60
}

export interface AuditStats {
  total: number
  blockCount: number
  confirmCount: number
  highRiskCount: number
  todayCount: number
}

export function computeAuditStats(logs: AuditLog[]): AuditStats {
  return {
    total: logs.length,
    blockCount: logs.filter((l) => l.decision === 'block').length,
    confirmCount: logs.filter((l) => l.decision === 'confirm').length,
    highRiskCount: logs.filter(isHighRiskLog).length,
    todayCount: logs.filter((l) => isToday(l.timestamp)).length,
  }
}

export interface AuditFilterState {
  userId: string
  role?: string
  toolName?: string
  riskLevel?: string
  decision?: string
  keyword: string
  highRiskOnly: boolean
}

export const DEFAULT_FILTER: AuditFilterState = {
  userId: '',
  role: undefined,
  toolName: undefined,
  riskLevel: undefined,
  decision: undefined,
  keyword: '',
  highRiskOnly: false,
}

export function filterAuditLogs(logs: AuditLog[], filter: AuditFilterState): AuditLog[] {
  const kw = filter.keyword.trim().toLowerCase()

  return logs.filter((log) => {
    if (filter.userId && !log.user_id.toLowerCase().includes(filter.userId.toLowerCase())) {
      return false
    }
    if (filter.role && log.user_role !== filter.role) return false
    if (filter.toolName && log.tool_name !== filter.toolName) return false
    if (filter.riskLevel && log.risk_level !== filter.riskLevel) return false
    if (filter.decision && log.decision !== filter.decision) return false

    if (filter.highRiskOnly) {
      const matchHigh =
        log.decision === 'block' ||
        log.decision === 'confirm' ||
        log.risk_level === 'high' ||
        log.risk_level === 'critical' ||
        Number(log.risk_score) >= 60
      if (!matchHigh) return false
    }

    if (kw) {
      const haystack = [
        log.user_input,
        log.reason,
        log.tool_name,
        log.tool_args,
        log.result_preview,
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(kw)) return false
    }

    return true
  })
}

export function getRowBackground(decision: string): string | undefined {
  switch (decision) {
    case 'block':
      return '#fff1f0'
    case 'confirm':
      return '#fff7e6'
    case 'mask':
      return '#e6f4ff'
    default:
      return undefined
  }
}

export function getDecisionDescription(decision: string): string {
  switch (decision) {
    case 'allow':
      return '工具调用已通过安全检查'
    case 'mask':
      return '工具调用结果已脱敏'
    case 'confirm':
      return '该调用需要人工确认'
    case 'block':
      return '该调用已被 AgentShield 阻断'
    default:
      return ''
  }
}

export function getExecutionStatusText(decision: string): string {
  switch (decision) {
    case 'allow':
      return '工具已执行'
    case 'mask':
      return '工具已执行，结果已脱敏'
    case 'confirm':
      return '等待人工确认或已记录人工确认'
    case 'block':
      return '工具已阻断，未执行'
    default:
      return '未知状态'
  }
}

export function detectHighRiskHighlights(log: AuditLog): string[] {
  const text = [
    log.user_input,
    log.tool_args,
    log.agent_plan,
    log.reason,
    log.result_preview,
  ].join(' ')
  const highlights: string[] = []
  if (/secret\.txt/i.test(text)) highlights.push('检测到敏感文件 secret.txt')
  if (/attacker@/i.test(text)) highlights.push('检测到外发目标 attacker@example.com')
  if (/rm\s+-rf/i.test(text)) highlights.push('检测到危险命令 rm -rf')
  if (/select\s+\*/i.test(text)) highlights.push('检测到危险 SQL SELECT * FROM students')
  if (/malicious/i.test(text)) highlights.push('检测到恶意文档诱导')
  if (/ignore\s+previous/i.test(text)) highlights.push('检测到提示注入 ignore previous instructions')
  return highlights
}

export function exportAuditCsv(logs: AuditLog[]): void {
  const header = ['时间', '用户', '角色', '工具', '参数摘要', '风险分', '风险等级', '决策', '原因']
  const rows = logs.map((log) => [
    formatTimestamp(log.timestamp),
    log.user_id,
    formatRoleLabel(log.user_role),
    log.tool_name,
    maskAuditSensitiveText(formatToolArgsSummary(log.tool_name, log.tool_args)),
    String(log.risk_score),
    RISK_LABELS[log.risk_level] ?? log.risk_level,
    DECISION_LABELS[log.decision] ?? log.decision,
    maskAuditSensitiveText(log.reason),
  ])

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agentshield_audit_logs.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function formatJsonDisplay(raw: string | Record<string, unknown>): string {
  const obj = parseJsonSafe(raw)
  if (obj) return maskAuditSensitiveText(JSON.stringify(obj, null, 2))
  return maskAuditSensitiveText(String(raw))
}
