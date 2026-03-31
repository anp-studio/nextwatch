<template>
  <div class="p-6 h-full flex flex-col overflow-y-auto bg-gray-50 relative">
    <div v-if="user" class="flex flex-col items-center w-full min-h-full pb-20">
      <div
        class="w-24 h-24 flex-shrink-0 rounded-full bg-rose-100 mb-4 flex items-center justify-center text-rose-500 overflow-hidden shadow-md mt-8 border-4 border-white"
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
              class="w-full border-b-2 border-rose-500 bg-transparent px-2 py-1 text-xl font-bold text-gray-900 text-center focus:outline-none"
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
            <h2 class="text-2xl font-bold text-gray-900 text-center truncate">
              {{ user?.user_metadata?.full_name || 'User' }}
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

        <p class="text-gray-500 text-sm font-medium">
          {{ user?.email }}
        </p>
      </div>

      <button
        @click="handleLogout"
        class="w-full max-w-xs bg-white border border-gray-200 text-gray-700 rounded-xl py-3 px-6 font-semibold hover:bg-gray-50 transition-colors shadow-sm mb-10"
      >
        Log Out
      </button>

      <div v-if="loading" class="flex justify-center w-full py-10">
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

      <div v-else class="w-full flex flex-col gap-10">
        <div class="w-full">
          <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
            Watched Movies
            <span class="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{{
              watchedMovies.length
            }}</span>
          </h3>

          <div
            v-if="watchedMovies.length === 0"
            class="text-center text-gray-500 py-12 bg-white rounded-2xl border border-dashed border-gray-300"
          >
            You haven't marked any movies as watched yet.
          </div>

          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
          >
            <div
              v-for="movie in watchedMovies"
              :key="movie.tmdbId"
              @click="openMovieDetails(movie)"
              class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm relative group cursor-pointer"
            >
              <img
                :src="IMAGE_BASE + movie.posterPath"
                :alt="movie.title"
                class="w-full h-full object-cover"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3"
              >
                <span
                  class="text-sm sm:text-base text-white font-bold leading-tight line-clamp-2 drop-shadow-md"
                  >{{ movie.title }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col justify-center h-full">
      <AuthForm />
    </div>

    <MovieDetails :is-open="isModalOpen" :movie="selectedMovie" @close="closeMovieDetails" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AuthForm from '~/components/AuthForm.vue'
import MovieDetails from '~/components/MovieDetails.vue'

const { user, logout } = useAuth()
const { watchedMovies, IMAGE_BASE } = useMovies()

const loading = ref(false)

const handleLogout = async () => {
  await logout()
}

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
    console.error(error.message)
  } finally {
    isSavingName.value = false
  }
}

const isModalOpen = ref(false)
const selectedMovie = ref(null)

const openMovieDetails = (movie) => {
  selectedMovie.value = movie
  isModalOpen.value = true
}

const closeMovieDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}
</script>
