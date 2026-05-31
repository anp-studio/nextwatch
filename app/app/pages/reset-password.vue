<template>
  <div
    class="flex-1 flex flex-col justify-center items-center h-full p-4 w-full bg-gray-50 dark:bg-gray-900"
  >
    <div
      class="auth-card-enter w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
    >
      <Transition name="auth-switch" mode="out-in">
        <div :key="resetStep" class="text-center mb-6">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            {{ resetStepDescription }}
          </p>
        </div>
      </Transition>

      <AlertMessage type="error" :message="errorMessage" />
      <AlertMessage type="success" :message="successMessage" />

      <Transition name="auth-switch" mode="out-in">
        <form
          v-if="!isOtpVerified"
          key="otp"
          class="auth-field-stagger flex flex-col gap-4"
          @submit.prevent="verifyOtpCode"
        >
          <div
            class="w-full bg-gray-100 dark:bg-gray-700 rounded-xl py-3 px-4 text-left border border-transparent"
          >
            <span class="block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
              Email address
            </span>
            <span class="block text-gray-900 dark:text-white truncate">
              {{ email || 'No email address found' }}
            </span>
          </div>

          <input
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="Reset code"
            required
            class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />

          <button
            type="submit"
            :disabled="isLoading || !email"
            class="btn-press w-full bg-rose-500 text-white rounded-xl py-3 px-6 font-semibold hover:bg-rose-600 transition-colors shadow-md mt-2 flex justify-center items-center h-12 disabled:opacity-70"
          >
            <LoadingSpinner v-if="isLoading" size="h-5 w-5" color="text-white" />
            <span v-else>Verify Code</span>
          </button>
        </form>

        <form
          v-else
          key="password"
          class="auth-field-stagger flex flex-col gap-4"
          @submit.prevent="savePassword"
        >
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="New password"
            required
            class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />

          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Confirm new password"
            required
            class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
          />

          <button
            type="submit"
            :disabled="isLoading"
            class="btn-press w-full bg-rose-500 text-white rounded-xl py-3 px-6 font-semibold hover:bg-rose-600 transition-colors shadow-md mt-2 flex justify-center items-center h-12 disabled:opacity-70"
          >
            <LoadingSpinner v-if="isLoading" size="h-5 w-5" color="text-white" />
            <span v-else>Update Password</span>
          </button>
        </form>
      </Transition>

      <div class="mt-4 flex flex-col items-center gap-3 text-sm">
        <NuxtLink
          to="/profile?auth=login"
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
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const route = useRoute()

const { verifyPasswordResetOtp, updatePassword, logout } = useAuth()

const getQueryString = (value) => {
  if (typeof value === 'string') return value
  return ''
}

const email = ref(getQueryString(route.query.email))
const otpCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isOtpVerified = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const resetStep = computed(() => (isOtpVerified.value ? 'password' : 'otp'))
const resetStepDescription = computed(() =>
  isOtpVerified.value
    ? 'Choose a new password for your account.'
    : 'Enter the code from your password reset email.'
)

const getErrorMessage = (error) => {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const verifyOtpCode = async () => {
  clearMessages()
  isLoading.value = true

  try {
    if (!email.value) {
      throw new Error('Request a new reset code before verifying.')
    }

    const { error } = await verifyPasswordResetOtp(email.value.trim(), otpCode.value.trim())

    if (error) throw error

    isOtpVerified.value = true
    successMessage.value = 'Code verified. Enter your new password.'
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const validatePasswords = () => {
  if (newPassword.value.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  if (newPassword.value !== confirmPassword.value) {
    throw new Error('Passwords do not match')
  }
}

const savePassword = async () => {
  clearMessages()
  isLoading.value = true

  try {
    validatePasswords()

    const { error } = await updatePassword(newPassword.value)

    if (error) throw error

    await logout()
    await navigateTo('/profile?auth=login&passwordReset=success')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}
</script>
