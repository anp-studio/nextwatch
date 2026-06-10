import type { Ref } from 'vue'

export function usePendingStorage<T>(
  storageKey: string,
  state: Ref<T[]>,
  guard: (item: unknown) => item is T
) {
  const load = () => {
    if (!import.meta.client) return

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        state.value = []
        return
      }

      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        state.value = []
        return
      }

      state.value = parsed.filter(guard)
    } catch {
      state.value = []
    }
  }

  const persist = () => {
    if (!import.meta.client) return

    try {
      if (state.value.length === 0) {
        window.localStorage.removeItem(storageKey)
        return
      }

      window.localStorage.setItem(storageKey, JSON.stringify(state.value))
    } catch {}
  }

  return { load, persist }
}
