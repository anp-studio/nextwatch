<template>
  <div class="flex-1 flex flex-col justify-center items-center h-full p-4 w-full">
    <div
      class="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
    >
      <div class="text-center mb-6">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          <span v-if="authView === 'login'">Welcome Back</span>
          <span v-else-if="authView === 'register'">Create Account</span>
          <span v-else>Reset Password</span>
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm">Find your next favorite movie</p>
      </div>

      <div
        v-if="errorMessage"
        class="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 p-3 rounded-xl text-sm font-medium text-center"
      >
        {{ errorMessage }}
      </div>
      <div
        v-if="successMessage"
        class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 p-3 rounded-xl text-sm font-medium text-center"
      >
        {{ successMessage }}
      </div>

      <form @submit.prevent="submitAuth" class="flex flex-col gap-4">
        <input
          v-model="email"
          type="email"
          placeholder="Email address"
          required
          class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
        />

        <input
          v-if="authView !== 'forgot'"
          v-model="password"
          type="password"
          placeholder="Password"
          required
          class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
        />

        <button
          type="submit"
          :disabled="isLoading || isGoogleLoading"
          class="w-full bg-rose-500 text-white rounded-xl py-3 px-6 font-semibold hover:bg-rose-600 transition-colors shadow-md mt-2 flex justify-center items-center h-12 disabled:opacity-70"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span v-else-if="authView === 'login'">Log In</span>
          <span v-else-if="authView === 'register'">Sign Up</span>
          <span v-else>Send Reset Link</span>
        </button>
      </form>

      <div class="mt-4 flex flex-col items-center gap-3 text-sm">
        <template v-if="authView === 'login'">
          <button
            @click="switchView('forgot')"
            class="text-gray-500 hover:text-rose-500 transition-colors"
          >
            Forgot password?
          </button>
          <div class="text-gray-400">
            Don't have an account?
            <button
              @click="switchView('register')"
              class="text-rose-500 font-semibold hover:underline"
            >
              Register
            </button>
          </div>
        </template>

        <template v-else-if="authView === 'register'">
          <div class="text-gray-400">
            Already have an account?
            <button
              @click="switchView('login')"
              class="text-rose-500 font-semibold hover:underline"
            >
              Log In
            </button>
          </div>
        </template>

        <template v-else>
          <button
            @click="switchView('login')"
            class="text-gray-500 hover:text-rose-500 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back to login
          </button>
        </template>
      </div>

      <div v-if="authView !== 'forgot'" class="flex items-center my-4">
        <div class="flex-1 border-t border-gray-200 dark:border-gray-600"></div>
        <span class="px-4 text-gray-400 text-sm">OR</span>
        <div class="flex-1 border-t border-gray-200 dark:border-gray-600"></div>
      </div>

      <button
        v-if="authView !== 'forgot'"
        @click="handleGoogleSignIn"
        :disabled="isLoading || isGoogleLoading"
        class="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors font-medium h-12 shadow-sm"
      >
        <svg v-if="!isGoogleLoading" class="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <svg
          v-else
          class="animate-spin h-5 w-5 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>{{ isGoogleLoading ? 'Signing in...' : 'Continue with Google' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { login, signup, resetPassword, signInWithGoogle } = useAuth()

const authView = ref('login')
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const switchView = (view) => {
  authView.value = view
  errorMessage.value = ''
  successMessage.value = ''
  password.value = ''
}

const submitAuth = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    if (authView.value === 'login') {
      const { error } = await login(email.value, password.value)
      if (error) throw error
      successMessage.value = 'Login successful!'
    } else if (authView.value === 'register') {
      if (password.value.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      const { error } = await signup(email.value, password.value)
      if (error) throw error
      successMessage.value = 'Registration successful! You can now log in.'
      setTimeout(() => switchView('login'), 2000)
    } else if (authView.value === 'forgot') {
      const { error } = await resetPassword(email.value)
      if (error) throw error
      successMessage.value = 'Password reset link sent! Check your email.'
      setTimeout(() => switchView('login'), 3000)
    }
  } catch (error) {
    errorMessage.value = error.message || 'Something went wrong.'
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSignIn = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isGoogleLoading.value = true

  try {
    await signInWithGoogle()
    setTimeout(() => {
      isGoogleLoading.value = false
    }, 3000)
  } catch (error) {
    errorMessage.value = 'Google Sign-In failed. Please try again.'
    isGoogleLoading.value = false
  }
}
</script>
