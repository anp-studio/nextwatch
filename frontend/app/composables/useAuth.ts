import { ref, computed } from 'vue'
import type { User, AuthError, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const AUTH_SYNC_DEFER_MS = 0

let hasInitializedAuth = false
let authStateSubscription: { unsubscribe: () => void } | null = null
let pendingAuthSyncTimeout: ReturnType<typeof setTimeout> | null = null

export const useAuth = () => {
  const supabase = useSupabase()
  const { syncWatchedMoviesFromSupabase, processPendingWatchedMovies, clearWatchedMovies } =
    useWatchedMovies()

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email || '')

  // used for fixing error on supabase side
  // will leave it in case it happens again
  const scheduleWatchedStateSyncAfterAuth = (accessToken?: string) => {
    if (pendingAuthSyncTimeout) {
      clearTimeout(pendingAuthSyncTimeout)
    }

    pendingAuthSyncTimeout = setTimeout(() => {
      pendingAuthSyncTimeout = null
      void syncWatchedStateAfterAuth(accessToken)
    }, AUTH_SYNC_DEFER_MS)
  }

  const syncWatchedStateAfterAuth = async (accessToken?: string) => {
    if (!accessToken) {
      clearWatchedMovies()
      return
    }

    await syncWatchedMoviesFromSupabase(accessToken)
    const processed = await processPendingWatchedMovies(accessToken)
    if (processed > 0) {
      await syncWatchedMoviesFromSupabase(accessToken)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      user.value = data.user
      session.value = data.session

      await syncWatchedStateAfterAuth(data.session?.access_token)

      return { user: data.user }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  const signup = async (email: string, password: string, username?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: username ? { data: { full_name: username } } : undefined,
      })

      if (error) throw error

      if (data.session) {
        user.value = data.user
        session.value = data.session
      }

      await syncWatchedStateAfterAuth(data.session?.access_token ?? undefined)

      return { user: data.user }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      user.value = null
      session.value = null
      clearWatchedMovies()
    } catch {
      // logout failed silently
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { data: _data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      return { user: data.user }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  //Login user again if there's an active session
  const initialize = async () => {
    if (hasInitializedAuth) {
      loading.value = false
      return
    }

    try {
      loading.value = true
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      session.value = currentSession
      user.value = currentSession?.user || null
      await scheduleWatchedStateSyncAfterAuth(currentSession?.access_token)

      if (!authStateSubscription) {
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
          session.value = newSession
          user.value = newSession?.user || null
        })

        authStateSubscription = data.subscription
      }

      hasInitializedAuth = true
    } catch {
      hasInitializedAuth = false
    } finally {
      loading.value = false
    }
  }

  // sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })

      if (error) throw error

      return { user: data }
    } catch {
      // Google sign-in failed
    }
  }

  return {
    user: computed(() => user.value),
    session: computed(() => session.value),
    loading: computed(() => loading.value),
    isAuthenticated,
    userEmail,
    login,
    signup,
    initialize,
    logout,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  }
}
