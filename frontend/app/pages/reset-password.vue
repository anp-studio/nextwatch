<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">Set New Password</h1>

      <!-- Error message -->
      <div v-if="errorMessage" class="bg-red-100 text-red-700 p-3 rounded mb-4">
        {{ errorMessage }}
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="bg-green-100 text-green-700 p-3 rounded mb-4">
        {{ successMessage }}
      </div>

      <form @submit.prevent="handlePasswordUpdate">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">New Password</label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="••••••••"
          />
          <p class="text-sm text-gray-500 mt-1">Minimum 6 characters</p>
        </div>

        <div class="mb-6">
          <label class="block text-gray-700 mb-2">Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {{ isLoading ? 'Updating...' : 'Update Password' }}
        </button>
      </form>

      <div class="mt-4 text-center">
        <button @click="router.push('/login')" type="button" class="text-blue-500 hover:underline">
          Back to Login
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { updatePassword } = useAuth()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handlePasswordUpdate() {
  errorMessage.value = ''
  successMessage.value = ''

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters'
    return
  }

  isLoading.value = true

  try {
    const { user, error } = await updatePassword(newPassword.value)

    if (error) {
      errorMessage.value = error.message
    } else if (user) {
      successMessage.value = 'Password updated successfully!'
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  } catch (error) {
    errorMessage.value = 'Failed to update password. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
