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
          @keyup.enter="saveName"
          placeholder="Enter new name..."
        />
        <button
          @click="saveName"
          :disabled="isSavingName"
          class="text-green-500 hover:text-green-600 p-1 transition-colors"
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
        <button
          @click="cancelEdit"
          class="text-gray-400 hover:text-rose-500 p-1 transition-colors"
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
      </template>

      <template v-else>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white text-center truncate">
          {{ user?.user_metadata?.username || user?.user_metadata?.full_name || 'User' }}
        </h2>
        <button
          @click="startEditing"
          class="text-gray-400 hover:text-rose-500 transition-colors p-1 flex-shrink-0"
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

  <button
    @click="handleLogout"
    class="w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl py-3 px-6 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm mb-10"
  >
    Log Out
  </button>
</template>

<script setup>
import { ref } from 'vue'

const { user, logout } = useAuth()
const supabase = useSupabase()

const isEditingName = ref(false)
const newName = ref('')
const isSavingName = ref(false)

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
  } catch (error) {
    // update failed
  } finally {
    isSavingName.value = false
  }
}

const handleLogout = async () => {
  await logout()
}
</script>
