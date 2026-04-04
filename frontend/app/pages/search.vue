<template>
  <div class="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <div class="mb-6 flex-shrink-0">
      <div class="relative w-full shadow-sm rounded-2xl overflow-hidden">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          @input="handleInput"
          type="text"
          placeholder="Find a movie..."
          class="w-full pl-11 pr-4 py-4 bg-white dark:bg-gray-800 border-none focus:ring-2 focus:ring-rose-500 text-gray-900 dark:text-white placeholder-gray-400 font-medium outline-none"
        />
        <button
          v-if="searchQuery"
          @click="clearSearch"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto pb-20">
      <div v-if="isSearching" class="flex justify-center py-10">
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
        v-else-if="!searchQuery && searchResults.length === 0"
        class="text-center text-gray-400 dark:text-gray-500 py-10"
      >
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
        <p>Enter a movie name to search.</p>
      </div>

      <div
        v-else-if="searchQuery && searchResults.length === 0 && !isSearching"
        class="text-center text-gray-500 dark:text-gray-400 py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600"
      >
        <p>No results for "{{ searchQuery }}"</p>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
      >
        <div
          v-for="movie in searchResults"
          :key="movie.id"
          class="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative"
        >
          <div class="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative">
            <img
              v-if="movie.poster_path"
              :src="IMAGE_BASE + movie.poster_path"
              :alt="movie.title"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400 text-xs"
            >
              No image
            </div>

            <div
              class="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
            >
              <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
              {{ movie.vote_average?.toFixed(1) || 'N/A' }}
            </div>
          </div>

          <div class="p-3 flex flex-col flex-1 justify-between">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{{ movie.title }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {{ movie.release_date ? movie.release_date.split('-')[0] : 'Unknown' }}
              </p>
            </div>

            <button
              v-if="isAlreadyWatched(movie.id)"
              disabled
              class="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg text-xs font-bold flex justify-center items-center gap-1 cursor-not-allowed"
            >
              <svg
                class="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Watched
            </button>
            <button
              v-else
              @click="addToWatched(movie)"
              class="w-full py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors rounded-lg text-xs font-bold flex justify-center items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { user } = useAuth()
const { queuePendingWatchedMovie, watchedMovies, IMAGE_BASE } = useMovies()

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
let debounceTimeout = null

const searchTMDB = async (query) => {
  if (!query) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`)
    const data = await response.json()
    searchResults.value = data.results || []
  } catch (error) {
    console.error('Error searching TMDB:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const handleInput = () => {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    searchTMDB(searchQuery.value)
  }, 500)
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
}

const isAlreadyWatched = (tmdbId) => {
  return watchedMovies.value.some((movie) => movie.tmdbId === tmdbId || movie.id === tmdbId)
}

const addToWatched = (movie) => {
  if (!user.value) {
    alert('You must be logged in to add a movie to your list!')
    return
  }

  const movieToSave = {
    ...movie,
    tmdbId: movie.id,
    poster: movie.poster_path ? IMAGE_BASE + movie.poster_path : null,
  }

  queuePendingWatchedMovie(movieToSave)
}
</script>
