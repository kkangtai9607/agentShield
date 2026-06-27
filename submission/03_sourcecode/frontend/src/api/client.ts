import axios from 'axios'
import { normalizeAuditLog } from '../utils/audit'
import { normalizeChatResponse } from '../utils/chat'
import { clearAuth, getToken } from '../utils/auth'

const client = axios.create({
  baseURL: '',
  timeout: 30000,
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token && token !== 'disabled') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export interface ChatRequest {
  message: string
  session_id?: string
}

export interface SemanticHit {
  intent_id: string
  intent_label: string
  similarity: number
  matched_phrase: string
  channel: string
}

export interface ShieldDecision {
  tool_name: string
  tool_args: Record<string, unknown>
  risk_score: number
  risk_level: string
  decision: string
  reason: string
  executed: boolean
  result_preview: string
  audit_id?: number
  semantic_hits?: SemanticHit[]
  semantic_mode?: string
}

export interface ChatResponse {
  answer: string
  agent_plan: { thought: string; tool_calls: Array<{ tool_name: string; tool_args: Record<string, unknown> }> }
  tool_results: Array<{ tool_name: string; success: boolean; result?: string; error?: string }>
  shield_decisions: ShieldDecision[]
  session_id: string
}

export interface AuditLog {
  id: number
  timestamp: string
  user_id: string
  user_role: string
  session_id: string
  user_input: string
  agent_plan: string
  tool_name: string
  tool_args: string
  risk_score: number
  risk_level: string
  decision: string
  reason: string
  result_preview: string
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const res = await client.get<AuditLog[]>('/api/audit')
  return (res.data ?? []).map((item) =>
    normalizeAuditLog(item as unknown as Record<string, unknown>),
  )
}

export interface PolicyData {
  role_permissions?: Record<string, Record<string, string>>
  tool_risk_level?: Record<string, string>
  sensitive_paths?: string[]
  dangerous_shell_patterns?: string[]
  dangerous_sql_patterns?: string[]
  prompt_injection_patterns?: string[]
  decision_thresholds?: Record<string, { min: number; max: number; decision: string }>
  [key: string]: unknown
}

export interface PolicyMeta {
  active_profile: string
  profile_name: string
  profile_description?: string
  role_labels: Record<string, string>
}

export interface PolicyProfileItem {
  id: string
  name: string
  description?: string
  role_labels?: Record<string, string>
}

export const getPolicies = async (): Promise<PolicyData> => {
  const res = await client.get('/api/policies')
  const raw = res.data as Record<string, unknown>
  const policy = raw?.policy ?? raw ?? {}
  return policy as PolicyData
}

export const getPoliciesFull = async () =>
  client.get<PolicyMeta & { policy: PolicyData }>('/api/policies')

export const listPolicyProfiles = async () =>
  client.get<{ active_profile: string; profiles: PolicyProfileItem[] }>('/api/policies/profiles')

export const activatePolicyProfile = async (profileId: string) =>
  client.post<PolicyMeta & { policy: PolicyData; demo_accounts: Array<{
    username: string
    password: string
    role: string
    name: string
  }> }>(`/api/policies/profile/${profileId}/activate`)

export const getDemoAccounts = async () =>
  client.get<Array<{ username: string; password: string; role: string; name: string; label: string }>>(
    '/api/auth/demo-accounts',
  )

export const reloadPolicies = async (): Promise<PolicyData> => {
  const res = await client.post('/api/policies/reload')
  const raw = res.data as Record<string, unknown>
  const policy = raw?.policy ?? raw ?? {}
  return policy as PolicyData
}

export const savePolicies = async (policy: PolicyData): Promise<PolicyData> => {
  const res = await client.put('/api/policies', policy)
  const raw = res.data as Record<string, unknown>
  const saved = raw?.policy ?? raw ?? {}
  return saved as PolicyData
}

export const sendChat = async (data: ChatRequest): Promise<ChatResponse> => {
  const res = await client.post('/api/chat', data)
  return normalizeChatResponse(res.data as Record<string, unknown>)
}

export interface AgentFrameworkInfo {
  id: string
  name: string
  description: string
  endpoint: string
}

export interface BenchmarkEvaluateRequest {
  user_role: string
  tool_name: string
  tool_args: Record<string, unknown>
  user_input?: string
  expected_decision?: string
  label?: string
}

export interface BenchmarkEvaluateResponse {
  id: string
  category: string
  user_role: string
  tool_name: string
  tool_args: Record<string, unknown>
  user_input: string
  expected_decision?: string | null
  actual_decision: string
  risk_score: number
  risk_level: string
  reason: string
  suggestion: string
  passed: boolean | null
  latency_ms: number
  engine: string
}

export interface AgentIntegrationResponse {
  framework: string
  mode: string
  answer: string
  agent_plan: string
  planned_tool_calls: Array<{ tool_name: string; tool_args: Record<string, unknown> }>
  tool_trace: Array<{
    tool_name: string
    tool_args: Record<string, unknown>
    decision: string
    risk_score: number
    executed: boolean
    result_preview: string
  }>
  shield_decisions: ShieldDecision[]
  session_id: string
}

export const api = {
  health: () =>
    client.get<{
      status: string
      use_mock_llm?: boolean
      plan_engine?: string
      audit_total?: number
      pending_confirm?: number
      auth_disabled?: boolean
      active_profile?: string
      profile_name?: string
      semantic_check?: { enabled: boolean; mode: string }
    }>('/health'),
  login: (username: string, password: string) =>
    client.post<{
      access_token: string
      user_id: string
      user_role: string
      name: string
    }>('/api/auth/login', { username, password }),
  getDemoAccounts,
  me: () => client.get<{ user_id: string; user_role: string; name: string }>('/api/auth/me'),
  chat: (data: ChatRequest) => client.post<ChatResponse>('/api/chat', data),
  sendChat,
  auditLogs: () => client.get<AuditLog[]>('/api/audit'),
  getAuditLogs,
  auditLog: (id: number) => client.get<AuditLog>(`/api/audit/${id}`),
  policies: () => client.get<{ policy: PolicyData } & PolicyMeta>('/api/policies'),
  getPolicies,
  getPoliciesFull,
  listPolicyProfiles,
  activatePolicyProfile,
  reloadPolicies: () => client.post<{ policy: PolicyData } & PolicyMeta>('/api/policies/reload'),
  savePolicies: (policy: PolicyData) => client.put<{ policy: PolicyData }>('/api/policies', policy),
  scenarios: () => client.get<Array<{ id: string; name: string; description: string }>>('/api/scenarios'),
  runScenario: (id: string) => client.post(`/api/scenarios/${id}/run`),
  agentFrameworks: () => client.get<AgentFrameworkInfo[]>('/api/agents/frameworks'),
  runLangchainAgent: (data: ChatRequest) =>
    client.post<AgentIntegrationResponse>('/api/agents/langchain/run', data),
  runMcpAgent: (data: ChatRequest) =>
    client.post<AgentIntegrationResponse>('/api/agents/mcp/run', data),
  runBenchmark: () => client.get('/api/benchmark/report'),
  evaluateBenchmarkSample: (data: BenchmarkEvaluateRequest) =>
    client.post<BenchmarkEvaluateResponse>('/api/benchmark/evaluate', data),
  integrationGuide: () => client.get('/api/integration/guide'),
  integrationPolicyTemplate: () => client.get<{ content: string }>('/api/integration/templates/policy'),
  shieldEvaluate: (data: {
    user_role: string
    tool_name: string
    tool_args?: Record<string, unknown>
    user_input?: string
    user_id?: string
    session_id?: string
    agent_plan?: string
    framework?: string
  }) =>
    client.post<{
      execute_allowed: boolean
      message: string
      decision: ShieldDecision
    }>('/api/shield/evaluate', data),
  confirmShield: (auditId: number, approved: boolean) =>
    client.post<{
      status: string
      message: string
      original_audit_id: number
      shield_decision: ShieldDecision
    }>(`/api/shield/confirm/${auditId}`, { approved }),
  semanticStatus: () =>
    client.get<{
      enabled: boolean
      mode: string
      similarity_threshold: number
      block_threshold: number
      confirm_threshold: number
      llm_available: boolean
    }>('/api/shield/semantic/status'),
  semanticCheck: (data: {
    text?: string
    user_input?: string
    tool_name?: string
    tool_args?: Record<string, unknown>
    tool_output?: string
  }) => client.post('/api/shield/semantic-check', data),
}

export default client
