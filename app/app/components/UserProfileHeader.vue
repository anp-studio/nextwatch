<template>
  <div
    class="w-24 h-24 flex-shrink-0 rounded-full bg-rose-100 dark:bg-rose-900 mb-4 flex items-center justify-center text-rose-500 overflow-hidden shadow-md mt-8 border-4 border-white dark:border-gray-700"
  >
    <img
      v-if="user?.user_metadata?.avatar_url"
      :src="user.user_metadata.avatar_url"
      class="w-full h-full object-cover"
    />
    <span v-else class="text-3xl font-bold uppercase">{{ user?.email?.charAt(0) || 'U' }}</span>
  </div>

  <div class="flex flex-col items-center mb-8 w-full">
    <div class="flex items-center justify-center gap-2 mb-1 w-full max-w-xs mx-auto">
      <template v-if="isEditingName">
        <input
          v-model="newName"
          type="text"
          class="w-full border-b-2 border-rose-500 bg-transparent px-2 py-1 text-xl font-bold text-gray-900 dark:text-white text-center focus:outline-none"
          placeholder="Enter new name..."
          @keyup.enter="saveName"
        />
        <button
          :disabled="isSavingName"
          class="text-green-500 hover:text-green-600 p-1 transition-colors"
          @click="saveName"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </button>
        <button class="text-gray-400 hover:text-rose-500 p-1 transition-colors" @click="cancelEdit">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </template>

      <template v-else>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white text-center truncate">
          {{ user?.user_metadata?.username || user?.user_metadata?.full_name || 'User' }}
        </h2>
        <button
          class="text-gray-400 hover:text-rose-500 transition-colors p-1 flex-shrink-0"
          @click="startEditing"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            ></path>
          </svg>
        </button>
      </template>
    </div>

    <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">
      {{ user?.email }}
    </p>
  </div>

  <div class="w-full max-w-xs flex flex-col gap-3 mb-10">
    <button
      class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl py-3 px-6 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      @click="openPasswordModal"
    >
      Change Password
    </button>

    <button
      class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl py-3 px-6 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      @click="handleLogout"
    >
      Log Out
    </button>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isPasswordModalOpen"
        class="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closePasswordModal"
      >
        <div
          class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col gap-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enter a new password for your account.
              </p>
            </div>
            <button
              class="text-gray-400 hover:text-rose-500 p-1 transition-colors"
              :disabled="isSavingPassword"
              @click="closePasswordModal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <AlertMessage type="error" :message="passwordErrorMessage" />

          <form class="flex flex-col gap-4" @submit.prevent="savePassword">
            <input
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Current password"
              required
              class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />

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
              :disabled="isSavingPassword"
              class="btn-press w-full bg-rose-500 text-white rounded-xl py-3 px-6 font-semibold hover:bg-rose-600 transition-colors shadow-md mt-2 flex justify-center items-center h-12 disabled:opacity-70"
            >
              <LoadingSpinner v-if="isSavingPassword" size="h-5 w-5" color="text-white" />
              <span v-else>Update Password</span>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const { user, logout, updatePassword } = useAuth()
const supabase = useSupabase()

const CURRENT_PASSWORD_ERROR_PATTERNS = [
  'current password',
  'current_password',
  'incorrect password',
  'invalid password',
  'invalid credentials',
]

const isEditingName = ref(false)
const newName = ref('')
const isSavingName = ref(false)
const isPasswordModalOpen = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordErrorMessage = ref('')
const isSavingPassword = ref(false)

const startEditing = () => {
  newName.value = user.value?.user_metadata?.full_name || ''
  isEditingName.value = true
}

const cancelEdit = () => {
  isEditingName.value = false
  newName.value = ''
}

const saveName = async () => {
  if (!newName.value.trim()) return

  isSavingName.value = true

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: newName.value.trim() },
    })

    if (error) throw error

    user.value = data.user
    isEditingName.value = false
  } catch {
    // Keep the editor open so the user can retry saving the name.
  } finally {
    isSavingName.value = false
  }
}

const handleLogout = async () => {
  await logout()
}

const isCurrentPasswordMismatchError = (error) => {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  return CURRENT_PASSWORD_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

const getErrorMessage = (error) => {
  if (isCurrentPasswordMismatchError(error)) {
    return 'Current password is incorrect'
  }

  return error instanceof Error ? error.message : 'Something went wrong.'
}

const resetPasswordForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordErrorMessage.value = ''
}

const openPasswordModal = () => {
  resetPasswordForm()
  isPasswordModalOpen.value = true
}

const closePasswordModal = () => {
  if (isSavingPassword.value) return

  isPasswordModalOpen.value = false
  resetPasswordForm()
}

const validatePasswords = () => {
  if (!currentPassword.value) {
    throw new Error('Current password is required')
  }

  if (newPassword.value.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }

  if (newPassword.value !== confirmPassword.value) {
    throw new Error('Passwords do not match')
  }
}

const savePassword = async () => {
  passwordErrorMessage.value = ''
  isSavingPassword.value = true

  try {
    validatePasswords()

    const { error } = await updatePassword(newPassword.value, currentPassword.value)

    if (error) throw error

    await logout()
    await navigateTo('/profile?auth=login&passwordReset=success')
  } catch (error) {
    passwordErrorMessage.value = getErrorMessage(error)
  } finally {
    isSavingPassword.value = false
  }
}
</script>
