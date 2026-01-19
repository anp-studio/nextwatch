import { ref, computed } from 'vue'
import type { User, AuthError, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

export const useAuth = () => {
  const supabase = useSupabase()

  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email || '')

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      user.value = data.user
      session.value = data.session

      return { user: data.user }
    } catch (error) {
      console.error('Login error:', error)
      return { user: null, error: error as AuthError }
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        user.value = data.user
        session.value = data.session
      }

      return { user: data.user }
    } catch (error) {
      console.error('Signup error:', error)
      return { user: null, error: error as AuthError }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      user.value = null
      session.value = null
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  //Login user again if there's an active session
  const initialize = async () => {
    try {
      loading.value = true
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      session.value = currentSession
      user.value = currentSession?.user || null

      supabase.auth.onAuthStateChange((_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user || null
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
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
    } catch (error) {
      console.error('Google Sign-In error:', error)
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
  }
}
