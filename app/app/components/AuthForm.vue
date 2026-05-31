<template>
  <div class="flex-1 flex flex-col justify-center items-center h-full p-4 w-full">
    <div
      class="auth-card-enter w-full max-w-md bg-surface-container-low p-8 rounded-2xl shadow-lg border border-outline-variant flex flex-col gap-4"
    >
      <Transition name="auth-switch" mode="out-in">
        <div :key="authView" class="text-center mb-6">
          <h2 class="text-3xl font-bold text-on-surface mb-2">
            <span v-if="authView === 'login'">Welcome Back</span>
            <span v-else-if="authView === 'register'">Create Account</span>
            <span v-else>Reset Password</span>
          </h2>
          <p v-if="authView === 'login'" class="text-on-surface-variant text-sm">
            Log in to access your movie recommendations
          </p>
          <p v-if="authView === 'register'" class="text-on-surface-variant text-sm">
            Find your next favorite movie
          </p>
        </div>
      </Transition>

      <AlertMessage type="error" :message="errorMessage" />
      <AlertMessage type="success" :message="successMessage" />

      <Transition name="auth-switch" mode="out-in">
        <form
          :key="authView"
          class="auth-field-stagger flex flex-col gap-4"
          @submit.prevent="submitAuth"
        >
          <input
            v-if="authView === 'register'"
            v-model="username"
            type="text"
            placeholder="Username"
            required
            class="w-full bg-surface-container text-on-surface rounded-xl py-3 px-4 outline-none border border-outline-variant placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />

          <input
            v-model="email"
            type="email"
            placeholder="Email address"
            required
            class="w-full bg-surface-container text-on-surface rounded-xl py-3 px-4 outline-none border border-outline-variant placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />

          <input
            v-if="authView !== 'forgot'"
            v-model="password"
            type="password"
            placeholder="Password"
            required
            class="w-full bg-surface-container text-on-surface rounded-xl py-3 px-4 outline-none border border-outline-variant placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />

          <VueHcaptcha
            v-if="authView === 'register'"
            ref="captchaWidget"
            :sitekey="siteKey"
            @verify="onCaptchaVerify"
            @expired="onCaptchaExpire"
            @error="onCaptchaError"
          />

          <button
            type="submit"
            :disabled="isLoading || isGoogleLoading"
            class="btn-press w-full bg-primary text-on-primary rounded-xl py-3 px-6 font-semibold hover:bg-primary/90 transition-colors shadow-md mt-2 flex justify-center items-center h-12 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LoadingSpinner v-if="isLoading" size="h-5 w-5" color="text-on-primary" />
            <span v-else-if="authView === 'login'">Log In</span>
            <span v-else-if="authView === 'register'">Sign Up</span>
            <span v-else>Send Reset Code</span>
          </button>
        </form>
      </Transition>

      <div class="mt-4 flex flex-col items-center gap-3 text-sm">
        <template v-if="authView === 'login'">
          <button
            class="text-on-surface-variant hover:text-on-surface transition-colors"
            @click="switchView('forgot')"
          >
            Forgot password?
          </button>
          <div class="text-on-surface-variant">
            Don't have an account?
            <button
              class="text-on-surface font-semibold hover:underline"
              @click="switchView('register')"
            >
              Register
            </button>
          </div>
        </template>

        <template v-else-if="authView === 'register'">
          <div class="text-on-surface-variant">
            Already have an account?
            <button
              class="text-on-surface font-semibold hover:underline"
              @click="switchView('login')"
            >
              Log In
            </button>
          </div>
        </template>

        <template v-else>
          <button
            class="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
            @click="switchView('login')"
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
        <div class="flex-1 border-t border-outline-variant"></div>
        <span class="px-4 text-label-sm text-on-surface-variant">OR</span>
        <div class="flex-1 border-t border-outline-variant"></div>
      </div>

      <button
        v-if="authView !== 'forgot'"
        :disabled="isLoading || isGoogleLoading"
        class="btn-press w-full flex items-center justify-center gap-3 bg-surface-container border border-outline-variant text-on-surface py-3 rounded-xl hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-70 transition-colors font-medium h-12 shadow-sm"
        @click="handleGoogleSignIn"
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
        <LoadingSpinner v-else size="h-5 w-5" color="text-on-surface-variant" />
        <span>{{ isGoogleLoading ? 'Signing in...' : 'Continue with Google' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'

const { login, signup, resetPassword, signInWithGoogle } = useAuth()
const route = useRoute()
const router = useRouter()

const config = useRuntimeConfig()
const siteKey = config.public.hcaptchaSiteKey

const emit = defineEmits(['authenticated'])

const authView = ref('login')
const email = ref('')
const password = ref('')
const username = ref('')
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const captchaToken = ref(null)
const captchaWidget = ref(null)

const onCaptchaVerify = (token) => {
  captchaToken.value = token
}

const onCaptchaExpire = () => {
  captchaToken.value = null
}

const onCaptchaError = () => {
  captchaToken.value = null
}

const resetCaptcha = () => {
  captchaToken.value = null
  captchaWidget.value?.reset()
}

const switchView = (view) => {
  authView.value = view
  errorMessage.value = ''
  successMessage.value = ''
  password.value = ''
  username.value = ''
  resetCaptcha()
}

const switchToLoginForExistingEmail = () => {
  authView.value = 'login'
  password.value = ''
  username.value = ''
  successMessage.value = ''
  errorMessage.value = 'That email is already registered. Please log in instead.'
  resetCaptcha()
}

onMounted(() => {
  if (route.query.auth === 'login') {
    authView.value = 'login'
  }

  if (route.query.passwordReset === 'success') {
    successMessage.value = 'Password updated. Please log in with your new password.'
  }
})

const submitAuth = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    if (authView.value === 'login') {
      const { error } = await login(email.value, password.value)
      if (error) throw error
      successMessage.value = 'Login successful!'
      setTimeout(() => emit('authenticated'), 1000)
    } else if (authView.value === 'register') {
      if (!captchaToken.value) {
        throw new Error('Please complete the captcha verification')
      }
      if (password.value.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }
      if (!username.value.trim()) {
        throw new Error('Username is required')
      }
      const { error } = await signup(
        email.value,
        password.value,
        username.value.trim(),
        captchaToken.value ?? undefined
      )
      if (error?.code === 'EMAIL_ALREADY_REGISTERED') {
        switchToLoginForExistingEmail()
        return
      }
      if (error) throw error
      successMessage.value = 'Registration successful! Please verify your email before logging in.'
      setTimeout(() => switchView('login'), 2000)
    } else if (authView.value === 'forgot') {
      const { error } = await resetPassword(email.value)
      if (error) throw error
      successMessage.value = 'Password reset code sent! Check your email.'
      await router.push({
        path: '/reset-password',
        query: {
          mode: 'otp',
          email: email.value,
        },
      })
    }
  } catch (error) {
    errorMessage.value = error.message || 'Something went wrong.'
    if (authView.value === 'register') {
      resetCaptcha()
    }
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
    const details = error instanceof Error ? error.message : ''
    errorMessage.value = `Google Sign-In failed. Please try again.${details ? ` ${details}` : ''}`
    isGoogleLoading.value = false
  }
}
</script>
