import { resolveRoleLabel } from './roleLabels'

export const TOOL_NAME_MAP: Record<string, string> = {
  read_file: '文件读取',
  send_email: '邮件发送',
  query_db: '数据库查询',
  run_shell: '命令执行',
  browser_mock: '网页浏览模拟',
}

export const TOOL_TAG_COLORS: Record<string, string> = {
  read_file: 'blue',
  send_email: 'purple',
  query_db: 'geekblue',
  run_shell: 'volcano',
  browser_mock: 'cyan',
}

export const DECISION_LABEL_MAP: Record<string, string> = {
  allow: '放行',
  mask: '脱敏',
  confirm: '人工确认',
  block: '阻断',
}

export const RISK_LEVEL_LABEL_MAP: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
}

export const ROLE_LABEL_MAP: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
}

export const TOOL_SELECT_OPTIONS = Object.entries(TOOL_NAME_MAP).map(([value, label]) => ({
  value,
  label,
}))

export function getToolLabel(toolName?: string): string {
  if (!toolName) return '-'
  return TOOL_NAME_MAP[toolName] || toolName
}

export function getToolTagColor(toolName?: string): string {
  if (!toolName) return 'default'
  return TOOL_TAG_COLORS[toolName] || 'default'
}

export function getDecisionLabel(decision?: string): string {
  if (!decision) return '-'
  return DECISION_LABEL_MAP[decision] ?? decision
}

export function getRiskLevelLabel(level?: string): string {
  if (!level) return '-'
  return RISK_LEVEL_LABEL_MAP[level] ?? level
}

export function getRoleLabel(role?: string): string {
  if (!role) return '-'
  return resolveRoleLabel(role)
}

export function formatRoleDisplay(role?: string): string {
  if (!role) return '-'
  const label = getRoleLabel(role)
  if (label === role) return role
  return `${label} (${role})`
}

export function formatToolInterceptText(toolName?: string): string {
  const label = getToolLabel(toolName)
  if (!toolName || label === toolName) return `AgentShield 拦截 ${toolName ?? ''} 工具调用`
  return `AgentShield 拦截${label}工具调用`
}
