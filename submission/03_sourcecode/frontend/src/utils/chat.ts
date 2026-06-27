import type { ChatResponse, ShieldDecision } from '../api/client'

export const CARD_STYLE = {
  borderRadius: 12,
  border: '1px solid #e6f0ff',
  boxShadow: '0 8px 24px rgba(15, 35, 70, 0.05)',
  marginBottom: 16,
} as const

export const DECISION_COLORS: Record<string, string> = {
  allow: '#52c41a',
  mask: '#1677ff',
  confirm: '#faad14',
  block: '#ff4d4f',
}

export const DECISION_LABELS: Record<string, string> = {
  allow: '放行',
  mask: '脱敏',
  confirm: '人工确认',
  block: '阻断',
}

export function normalizeChatResponse(data: Record<string, unknown>): ChatResponse {
  const agentPlanRaw = (data.agent_plan ?? data.agentPlan ?? {}) as Record<string, unknown>
  const toolCallsRaw = agentPlanRaw.tool_calls ?? agentPlanRaw.toolCalls ?? []

  const tool_calls = (toolCallsRaw as Array<Record<string, unknown>>).map((t) => ({
    tool_name: String(t.tool_name ?? t.toolName ?? ''),
    tool_args: (t.tool_args ?? t.toolArgs ?? {}) as Record<string, unknown>,
  }))

  const shield_decisions = normalizeDecisions(
    data.shield_decisions ?? data.shieldDecisions ?? [],
  )

  const tool_results = ((data.tool_results ?? data.toolResults ?? []) as Array<Record<string, unknown>>).map(
    (t) => ({
      tool_name: String(t.tool_name ?? t.toolName ?? ''),
      success: Boolean(t.success),
      result: t.result ? String(t.result) : undefined,
      error: t.error ? String(t.error) : undefined,
    }),
  )

  return {
    answer: String(data.answer ?? ''),
    agent_plan: {
      thought: String(agentPlanRaw.thought ?? ''),
      tool_calls,
    },
    tool_results,
    shield_decisions,
    session_id: String(data.session_id ?? data.sessionId ?? ''),
  }
}

export function normalizeDecisions(raw: unknown): ShieldDecision[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const d = item as Record<string, unknown>
    return {
      tool_name: String(d.tool_name ?? d.toolName ?? ''),
      tool_args: (d.tool_args ?? d.toolArgs ?? {}) as Record<string, unknown>,
      risk_score: Number(d.risk_score ?? d.riskScore ?? 0),
      risk_level: String(d.risk_level ?? d.riskLevel ?? 'low'),
      decision: String(d.decision ?? d.action ?? 'allow'),
      reason: String(d.reason ?? ''),
      executed: Boolean(d.executed),
      result_preview: String(d.result_preview ?? d.resultPreview ?? ''),
      audit_id: d.audit_id != null ? Number(d.audit_id) : d.auditId != null ? Number(d.auditId) : d.id != null ? Number(d.id) : undefined,
      semantic_hits: Array.isArray(d.semantic_hits ?? d.semanticHits)
        ? ((d.semantic_hits ?? d.semanticHits) as Array<Record<string, unknown>>).map((h) => ({
            intent_id: String(h.intent_id ?? h.intentId ?? ''),
            intent_label: String(h.intent_label ?? h.intentLabel ?? ''),
            similarity: Number(h.similarity ?? 0),
            matched_phrase: String(h.matched_phrase ?? h.matchedPhrase ?? ''),
            channel: String(h.channel ?? ''),
          }))
        : [],
      semantic_mode: String(d.semantic_mode ?? d.semanticMode ?? 'off'),
    }
  })
}

export function parseRiskReasons(reason: string): string[] {
  if (!reason) return []
  return reason
    .split(/[;；\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export type RuleTagType = 'permission' | 'sensitive' | 'email' | 'injection' | 'shell' | 'sql' | 'semantic' | 'default'

export function classifyRiskRule(text: string): RuleTagType {
  const t = text.toLowerCase()
  if (t.includes('语义风险') || t.includes('语义关联')) return 'semantic'
  if (t.includes('无权') || t.includes('不允许') || t.includes('角色')) return 'permission'
  if (t.includes('api_key') || t.includes('password') || t.includes('敏感') || t.includes('secret')) return 'sensitive'
  if (t.includes('邮箱') || t.includes('attacker') || t.includes('外部')) return 'email'
  if (t.includes('注入') || t.includes('injection') || t.includes('ignore')) return 'injection'
  if (t.includes('shell') || t.includes('rm -rf') || t.includes('命令') || t.includes('sudo')) return 'shell'
  if (t.includes('sql') || t.includes('select')) return 'sql'
  return 'default'
}

export const RULE_TAG_COLORS: Record<RuleTagType, string> = {
  permission: 'red',
  sensitive: '#cf1322',
  email: 'orange',
  injection: 'purple',
  shell: 'red',
  sql: 'red',
  semantic: 'purple',
  default: 'default',
}

export function getDecisionKey(decision: ShieldDecision, index: number): string {
  return String(
    decision.audit_id ?? `${decision.tool_name || 'tool'}-${index}`,
  )
}

export type ManualConfirmStatus = 'confirmed' | 'cancelled'

export interface ManualConfirmEntry {
  status: ManualConfirmStatus
  updatedAt: string
  message?: string
}

export type ManualConfirmState = Record<string, ManualConfirmEntry>

export const RISK_TIMELINE_COLORS: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
  critical: 'red',
}

export function getExecutionTimelineMeta(
  decision: ShieldDecision,
  manualState?: ManualConfirmEntry,
): { color: string; text: string } {
  const dec = decision.decision
  if (dec === 'allow') {
    return { color: 'green', text: '工具已执行' }
  }
  if (dec === 'mask') {
    return { color: 'blue', text: '工具已执行，结果已脱敏' }
  }
  if (dec === 'block') {
    return { color: 'red', text: '工具已阻断，未执行' }
  }
  if (dec === 'confirm') {
    if (manualState?.status === 'confirmed') {
      return {
        color: 'green',
        text: manualState.message || '人工确认已完成，工具已执行',
      }
    }
    if (manualState?.status === 'cancelled') {
      return { color: 'gray', text: '人工取消，工具未执行' }
    }
    return { color: 'gray', text: '等待人工确认，暂未执行' }
  }
  return {
    color: 'gray',
    text: decision.executed ? '已执行' : '未执行',
  }
}

export function getDecisionTimelineMeta(
  decision: ShieldDecision,
  manualState?: ManualConfirmEntry,
): { color: string; text: string } {
  const dec = decision.decision
  if (dec === 'confirm' && manualState?.status === 'confirmed') {
    return { color: 'green', text: '人工确认已完成' }
  }
  if (dec === 'confirm' && !manualState) {
    return { color: 'orange', text: '需要人工确认' }
  }
  return {
    color: DECISION_COLORS[dec] ?? 'gray',
    text: DECISION_LABELS[dec] ?? dec,
  }
}

export function getAuditTimelineMeta(decision: ShieldDecision): { color: string; text: string } {
  if (decision.audit_id) {
    return {
      color: 'green',
      text: `已写入审计日志：审计 #${decision.audit_id}`,
    }
  }
  return { color: 'gray', text: '暂无审计 ID' }
}

export function maskSensitiveText(text: string): string {
  if (!text) return text
  let masked = text
  const patterns: Array<[RegExp, string]> = [
    [/sk-[a-zA-Z0-9]{4,}/gi, 'sk-[MASKED]'],
    [/API_KEY\s*=\s*[^\s,;]+/gi, 'API_KEY=[MASKED]'],
    [/password\s*[=:]\s*[^\s,;]+/gi, 'password=[MASKED]'],
    [/token\s*[=:]\s*[^\s,;]+/gi, 'token=[MASKED]'],
    [/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [MASKED]'],
    [/(mysql|postgresql|mongodb):\/\/[^\s]+/gi, '[MASKED_DB_URL]'],
    [/DB_URL\s*=\s*[^\s]+/gi, 'DB_URL=[MASKED]'],
    [/1[3-9]\d{9}/g, '[MASKED_PHONE]'],
    [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED_EMAIL]'],
    [/\d{17}[\dXx]/g, '[MASKED_ID]'],
  ]
  for (const [re, rep] of patterns) {
    masked = masked.replace(re, rep)
  }
  return masked
}

export function detectSensitiveTypes(text: string): string[] {
  const types: string[] = []
  if (/sk-/i.test(text)) types.push('API_KEY')
  if (/password/i.test(text)) types.push('password')
  if (/token/i.test(text)) types.push('token')
  if (/Bearer/i.test(text)) types.push('Bearer')
  if (/(mysql|postgresql|mongodb):\/\//i.test(text) || /DB_URL/i.test(text)) types.push('DB_URL')
  if (/1[3-9]\d{9}/.test(text)) types.push('phone')
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) types.push('email')
  if (/\d{17}[\dXx]/.test(text)) types.push('id_card')
  return types
}
