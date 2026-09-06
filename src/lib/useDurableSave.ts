import { useRef, useState } from 'react'
import { useTravelStore } from '../store/travelStore'

export function useDurableSave() {
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function save(action: () => Promise<boolean>, onSuccess: () => void) {
    if (pending.current) return
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      if (await action()) onSuccess()
      else setError(useTravelStore.getState().storageError ?? 'Changes were not saved. Please try again.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Changes were not saved. Please try again.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }
  return { saving, error, setError, save }
}
