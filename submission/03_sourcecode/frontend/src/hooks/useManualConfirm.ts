import { useCallback, useState } from 'react'
import type { ShieldDecision } from '../api/client'
import { api } from '../api/client'
import type { ManualConfirmState, ManualConfirmStatus } from '../utils/chat'

export function useManualConfirm() {
  const [manualConfirmState, setManualConfirmState] = useState<ManualConfirmState>({})

  const clearManualConfirm = useCallback(() => {
    setManualConfirmState({})
  }, [])

  const handleConfirmAction = useCallback(
    async (
      key: string,
      auditId: number | undefined,
      approved: boolean,
      onUpdate?: (
        key: string,
        status: ManualConfirmStatus,
        resultMessage?: string,
        updatedDecision?: ShieldDecision,
      ) => void,
    ) => {
      if (!auditId) {
        onUpdate?.(key, approved ? 'confirmed' : 'cancelled')
        setManualConfirmState((prev) => ({
          ...prev,
          [key]: {
            status: approved ? 'confirmed' : 'cancelled',
            updatedAt: new Date().toISOString(),
          },
        }))
        return
      }

      try {
        const res = await api.confirmShield(auditId, approved)
        const updated = res.data.shield_decision as ShieldDecision
        onUpdate?.(key, approved ? 'confirmed' : 'cancelled', res.data.message, updated)
        setManualConfirmState((prev) => ({
          ...prev,
          [key]: {
            status: approved ? 'confirmed' : 'cancelled',
            updatedAt: new Date().toISOString(),
            message: res.data.message,
          },
        }))
      } catch {
        onUpdate?.(key, approved ? 'confirmed' : 'cancelled', '确认请求失败，请检查后端')
        setManualConfirmState((prev) => ({
          ...prev,
          [key]: {
            status: approved ? 'confirmed' : 'cancelled',
            updatedAt: new Date().toISOString(),
            message: '确认请求失败，请检查后端',
          },
        }))
      }
    },
    [],
  )

  return {
    manualConfirmState,
    setManualConfirmState,
    clearManualConfirm,
    handleConfirmAction,
  }
}
