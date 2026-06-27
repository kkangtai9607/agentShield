export interface AuthUser {
  user_id: string
  user_role: string
  name: string
}

const TOKEN_KEY = 'agentshield_token'
const USER_KEY = 'agentshield_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export const DEMO_ACCOUNTS = [
  { username: 'student01', password: 'student123', label: '学生', role: 'student' },
  { username: 'teacher01', password: 'teacher123', label: '教师', role: 'teacher' },
  { username: 'admin01', password: 'admin123', label: '管理员', role: 'admin' },
]
