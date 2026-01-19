<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center">
        {{ isLoginMode ? 'Login' : 'Register' }}
      </h1>

      <!-- Error message -->
      <div v-if="errorMessage" class="bg-red-100 text-red-700 p-3 rounded mb-4">
        {{ errorMessage }}
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="bg-green-100 text-green-700 p-3 rounded mb-4">
        {{ successMessage }}
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-gray-700 mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="your@email.com"
          />
        </div>

        <div class="mb-6">
          <label class="block text-gray-700 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {{ isLoading ? 'Loading...' : isLoginMode ? 'Login' : 'Register' }}
        </button>
      </form>

      <!-- Toggle modes -->
      <div class="mt-4 text-center">
        <button @click="toggleMode" class="text-blue-500 hover:underline">
          {{ isLoginMode ? 'Need an account? Register' : 'Already have an account? Login' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { login, signup } = useAuth()
const router = useRouter()

const isLoginMode = ref(true)
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function toggleMode() {
  isLoginMode.value = !isLoginMode.value
  errorMessage.value = ''
  successMessage.value = ''
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
      const { user, error } = await signup(email.value, password.value)

      if (error) {
        errorMessage.value = error.message
      } else if (user) {
        successMessage.value = 'Registration successful! You can now login.'
        setTimeout(() => {
          isLoginMode.value = true
          successMessage.value = ''
        }, 2000)
      }
    }
  } catch (error) {
    errorMessage.value = 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
