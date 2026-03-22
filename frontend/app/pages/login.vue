<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="bg-gray-800 text-white p-8 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">
        {{ isResetMode ? 'Reset Password' : isLoginMode ? 'Login' : 'Register' }}
      </h1>

      <!-- Error message -->
      <div v-if="errorMessage" class="bg-red-900/60 text-red-300 p-3 rounded mb-4">
        {{ errorMessage }}
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="bg-green-900/60 text-green-300 p-3 rounded mb-4">
        {{ successMessage }}
      </div>

      <!-- Reset Password Form -->
      <form v-if="isResetMode" @submit.prevent="handleResetPassword">
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full bg-gray-900 text-white px-3 py-2 border border-gray-700 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="your@email.com"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-500 disabled:bg-gray-700 transition"
        >
          {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
        </button>

        <div class="mt-4 text-center">
          <button @click="backToLogin" type="button" class="text-red-500 hover:underline">
            Back to Login
          </button>
        </div>
      </form>

      <!-- Login/Register Form -->
      <form v-else @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full bg-gray-900 text-white px-3 py-2 border border-gray-700 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="your@email.com"
          />
        </div>

        <div class="mb-4">
          <label class="block text-gray-400 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full bg-gray-900 text-white px-3 py-2 border border-gray-700 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="••••••••"
          />
        </div>

        <!-- Forgot Password Link -->
        <div v-if="isLoginMode" class="mb-6 text-right">
          <button @click="showResetMode" type="button" class="text-sm text-red-400 hover:underline">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          :disabled="isLoading || isGoogleLoading"
          class="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-500 disabled:bg-gray-700 transition"
        >
          {{ isLoading ? 'Loading...' : isLoginMode ? 'Login' : 'Register' }}
        </button>
      </form>

      <!-- Divider -->
      <div class="flex items-center my-6">
        <div class="flex-1 border-t border-gray-700"></div>
        <span class="px-4 text-gray-400 text-sm">OR</span>
        <div class="flex-1 border-t border-gray-700"></div>
      </div>

      <!-- Google Sign-In -->
      <button
        @click="handleGoogleSignIn"
        :disabled="isLoading || isGoogleLoading"
        class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
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
        <span
          v-if="isGoogleLoading"
          class="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"
        ></span>
        <span>{{ isGoogleLoading ? 'Signing in...' : 'Continue with Google' }}</span>
      </button>

      <!-- Toggle modes -->
      <div class="mt-4 text-center">
        <button @click="toggleMode" class="text-red-500 hover:underline">
          {{ isLoginMode ? 'Need an account? Register' : 'Already have an account? Login' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { login, signup, signInWithGoogle, resetPassword } = useAuth()
const router = useRouter()

const isLoginMode = ref(true)
const isResetMode = ref(false)
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function toggleMode() {
  isLoginMode.value = !isLoginMode.value
  errorMessage.value = ''
  successMessage.value = ''
}

function showResetMode() {
  isResetMode.value = true
  isLoginMode.value = false
  errorMessage.value = ''
  successMessage.value = ''
  password.value = ''
}

function backToLogin() {
  isResetMode.value = false
  isLoginMode.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

async function handleResetPassword() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const { error } = await resetPassword(email.value)

    if (error) {
      errorMessage.value = error.message
    } else {
      successMessage.value = 'Password reset link sent! Check your email.'
      setTimeout(() => {
        backToLogin()
      }, 3000)
    }
  } catch {
    errorMessage.value = 'Failed to send reset link. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    if (isLoginMode.value) {
      const { user, error } = await login(email.value, password.value)

      if (error) {
        errorMessage.value = error.message
      } else if (user) {
        successMessage.value = 'Login successful!'
        setTimeout(() => {
          router.push('/')
        }, 1000)
      }
    } else {
      if (password.value.length < 6) {
        errorMessage.value = 'Password must be at least 6 characters'
        return
      }

      const { user, error } = await signup(email.value, password.value)

      if (error) {
        errorMessage.value = error.message
      } else if (user) {
        successMessage.value = 'Registration successful! You can now login.'
        setTimeout(() => {
          isLoginMode.value = true
          successMessage.value = ''
          router.push('/login')
        }, 2000)
      }
    }
  } catch {
    errorMessage.value = 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleGoogleSignIn() {
  errorMessage.value = ''
  successMessage.value = ''
  isGoogleLoading.value = true

  try {
    await signInWithGoogle()
    setTimeout(() => {
      isGoogleLoading.value = false
    }, 3000)
  } catch {
    errorMessage.value = 'Google Sign-In failed. Please try again.'
    isGoogleLoading.value = false
  }
}
</script>
