<template>
  <div class="p-6 h-full flex flex-col overflow-y-auto bg-gray-50">
    <div v-if="user" class="flex flex-col items-center w-full min-h-full pb-20">
      <div
        class="w-24 h-24 rounded-full bg-rose-100 mb-4 flex items-center justify-center text-rose-500 overflow-hidden shadow-md mt-8 border-4 border-white"
      >
        <img
          v-if="user?.user_metadata?.avatar_url"
          :src="user.user_metadata.avatar_url"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-3xl font-bold uppercase">{{ user?.email?.charAt(0) || 'U' }}</span>
      </div>

      <h2 class="text-2xl font-bold mb-1 text-gray-900">
        {{ user?.user_metadata?.full_name || 'User' }}
      </h2>
      <p class="text-gray-500 mb-6 text-sm">{{ user?.email }}</p>

      <button
        @click="handleLogout"
        class="w-full max-w-xs bg-white border border-gray-200 text-gray-700 rounded-xl py-3 px-6 font-semibold hover:bg-gray-50 transition-colors shadow-sm mb-10"
      >
        Log Out
      </button>

      <div class="w-full">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
          Watched Movies
          <span class="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{{
            watchedMovies.length
          }}</span>
        </h3>

        <div v-if="loading" class="flex justify-center py-10">
          <svg
            class="animate-spin h-8 w-8 text-rose-500"
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
        </div>

        <div
          v-else-if="watchedMovies.length === 0"
          class="text-center text-gray-500 py-12 bg-white rounded-2xl border border-dashed border-gray-300"
        >
          You haven't marked any movies yet.
        </div>

        <div v-else class="grid grid-cols-3 gap-3">
          <div
            v-for="movie in watchedMovies"
            :key="movie.tmdbId"
            class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm relative group"
          >
            <img
              :src="IMAGE_BASE + movie.posterPath"
              :alt="movie.title"
              class="w-full h-full object-cover"
            />
            <div
              class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
            >
              <span class="text-[10px] text-white font-medium truncate">{{ movie.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col justify-center h-full">
      <AuthForm />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import AuthForm from '~/components/AuthForm.vue'

const { user, logout } = useAuth()
const { watchedMovies, syncWatchedMoviesFromSupabase, IMAGE_BASE, clearWatchedMovies } = useMovies()

const loading = ref(false)

onMounted(async () => {
  if (user.value) {
    loading.value = true
    await syncWatchedMoviesFromSupabase()
    loading.value = false
  }
})

watch(user, async (newUser) => {
  if (newUser) {
    loading.value = true
    await syncWatchedMoviesFromSupabase()
    loading.value = false
  } else {
    clearWatchedMovies()
  }
})

const handleLogout = async () => {
  await logout()
}
</script>
