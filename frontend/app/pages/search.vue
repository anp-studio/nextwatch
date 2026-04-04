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
        <LoadingSpinner />
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
        <MovieSearchCard
          v-for="movie in searchResults"
          :key="movie.id"
          :movie="movie"
          :is-watched="isAlreadyWatched(movie.id)"
          @add="addToWatched"
          @details="openDetails"
        />
      </div>
    </div>

    <MovieDetails
      :is-open="isModalOpen"
      :movie="selectedMovie"
      :show-add-button="true"
      :is-watched="selectedMovie ? isAlreadyWatched(selectedMovie.id) : false"
      @close="closeDetails"
      @add="addToWatchedFromModal"
    />

    <LoginPromptModal :is-open="showLoginModal" @close="showLoginModal = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { user } = useAuth()
const { markAsWatched, queuePendingWatchedMovie, watchedMovies } = useWatchedMovies()
const { getMovieDetails } = useMovieDetails()

const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
let debounceTimeout = null

const isModalOpen = ref(false)
const selectedMovie = ref(null)
const isLoadingDetails = ref(false)

const showLoginModal = ref(false)

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
  } catch {
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
  return watchedMovies.value.some((movie) => movie.tmdbId === tmdbId)
}

const openDetails = async (movie) => {
  if (isLoadingDetails.value) return
  isLoadingDetails.value = true
  try {
    selectedMovie.value = await getMovieDetails(movie.id)
    isModalOpen.value = true
  } catch {
    // failed to load movie details
  } finally {
    isLoadingDetails.value = false
  }
}

const closeDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}

const buildMovieToSave = (movie) => ({
  ...movie,
  tmdbId: movie.id,
  poster: posterUrl(movie.poster_path),
  year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0,
})

const addToWatched = async (movie) => {
  if (!user.value) {
    showLoginModal.value = true
    return
  }

  const movieToSave = buildMovieToSave(movie)
  const status = await markAsWatched(movieToSave)
  if (status === 'unauthorized' || status === 'error') {
    queuePendingWatchedMovie(movieToSave)
  }
}

const addToWatchedFromModal = async () => {
  if (!selectedMovie.value) return

  if (!user.value) {
    showLoginModal.value = true
    return
  }

  const status = await markAsWatched(selectedMovie.value)
  if (status === 'unauthorized' || status === 'error') {
    queuePendingWatchedMovie(selectedMovie.value)
  }
}
</script>
