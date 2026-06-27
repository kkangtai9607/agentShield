import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import { resolveRoleLabel, setDynamicRoleLabels } from '../utils/roleLabels'

const FALLBACK_PROFILES: PolicyProfile[] = [
  { id: 'campus', name: '校园演示', description: '', role_labels: { student: '学生', teacher: '教师', admin: '管理员' } },
  { id: 'personal', name: '个人助手', description: '', role_labels: { owner: '主人', guest: '访客' } },
  { id: 'enterprise', name: '企业客服', description: '', role_labels: { agent: '一线客服', supervisor: '主管' } },
]

export interface PolicyProfile {
  id: string
  name: string
  description: string
  role_labels: Record<string, string>
}

interface ProfileContextValue {
  activeProfile: string
  profileName: string
  profileDescription: string
  roleLabels: Record<string, string>
  profiles: PolicyProfile[]
  loading: boolean
  refresh: () => Promise<void>
  switchProfile: (profileId: string) => Promise<void>
  formatRole: (role: string) => string
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState('campus')
  const [profileName, setProfileName] = useState('校园演示')
  const [profileDescription, setProfileDescription] = useState('')
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({})
  const [profiles, setProfiles] = useState<PolicyProfile[]>([])
  const [loading, setLoading] = useState(true)

  const applyMeta = useCallback((meta: {
    active_profile?: string
    profile_name?: string
    profile_description?: string
    role_labels?: Record<string, string>
  }) => {
    if (meta.active_profile) setActiveProfile(meta.active_profile)
    if (meta.profile_name) setProfileName(meta.profile_name)
    if (meta.profile_description !== undefined) setProfileDescription(meta.profile_description)
    if (meta.role_labels) {
      setRoleLabels(meta.role_labels)
      setDynamicRoleLabels(meta.role_labels)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [policyRes, profilesRes] = await Promise.all([
        api.getPoliciesFull(),
        api.listPolicyProfiles(),
      ])
      applyMeta({
        active_profile: policyRes.data.active_profile,
        profile_name: policyRes.data.profile_name,
        profile_description: policyRes.data.profile_description,
        role_labels: policyRes.data.role_labels,
      })
      setProfiles(
        (profilesRes.data.profiles ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          role_labels: p.role_labels ?? {},
        })),
      )
      setActiveProfile(profilesRes.data.active_profile ?? policyRes.data.active_profile ?? 'campus')
    } catch (e) {
      console.error('load profile meta failed', e)
      setProfiles(FALLBACK_PROFILES)
    } finally {
      setLoading(false)
    }
  }, [applyMeta])

  const switchProfile = useCallback(
    async (profileId: string) => {
      const res = await api.activatePolicyProfile(profileId)
      applyMeta({
        active_profile: res.data.active_profile,
        profile_name: res.data.profile_name,
        role_labels: res.data.role_labels,
      })
      setActiveProfile(res.data.active_profile)
      await refresh()
    },
    [applyMeta, refresh],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const formatRole = useCallback(
    (role: string) => roleLabels[role] ?? role,
    [roleLabels],
  )

  const value = useMemo(
    () => ({
      activeProfile,
      profileName,
      profileDescription,
      roleLabels,
      profiles,
      loading,
      refresh,
      switchProfile,
      formatRole,
    }),
    [
      activeProfile,
      profileName,
      profileDescription,
      roleLabels,
      profiles,
      loading,
      refresh,
      switchProfile,
      formatRole,
    ],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return ctx
}

export function useFormatRole(role: string) {
  const { formatRole } = useProfile()
  return formatRole(role)
}
