/** 由 ProfileContext 同步当前场景的角色中文名 */
const FALLBACK: Record<string, string> = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
  owner: '主人',
  guest: '访客',
  agent: '一线客服',
  supervisor: '主管',
}

let dynamicLabels: Record<string, string> = {}

export function setDynamicRoleLabels(labels: Record<string, string>) {
  dynamicLabels = labels
}

export function resolveRoleLabel(role: string): string {
  return dynamicLabels[role] ?? FALLBACK[role] ?? role
}
