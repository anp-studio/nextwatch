<template>
  <div class="h-full flex flex-col bg-gray-50 relative overflow-hidden">
    <div class="flex-1 relative w-full px-6 py-4 flex flex-col items-center justify-center mt-4">
      <div v-if="pending" class="flex flex-col items-center text-gray-400">
        <svg
          class="animate-spin h-10 w-10 text-rose-500 mb-4"
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
        <p>Finding movies...</p>
      </div>

      <div v-else-if="movies.length === 0" class="text-center text-gray-500">
        <p class="text-xl font-medium mb-2">You're all caught up!</p>
        <p class="text-sm">Check back later for more movies.</p>
      </div>

      <div v-else class="w-full max-w-sm h-[65vh] relative mx-auto">
        <MovieCard
          :movie="currentMovieFormatted"
          @open-details="openDetails"
          @dislike="handleDislike"
          @watched="handleLike"
          @to-watch="handleLike"
        />
      </div>
    </div>

    <div v-if="isDetailsOpen" class="absolute inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      <div v-if="loadingDetails" class="flex-1 flex justify-center items-center">
        <svg
          class="animate-spin h-10 w-10 text-rose-500"
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

      <template v-else-if="detailedMovie">
        <div class="relative w-full aspect-[2/3] bg-gray-900">
          <button
            @click="closeDetails"
            class="absolute top-6 left-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </button>

          <img
            :src="detailedMovie.poster_path ? IMAGE_BASE + detailedMovie.poster_path : ''"
            class="w-full h-full object-cover"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"
          ></div>
        </div>

        <div
          class="px-6 py-4 -mt-12 relative z-10 bg-white rounded-t-3xl h-full shadow-[0_-10px_20px_rgba(0,0,0,0.1)]"
        >
          <h2 class="text-3xl font-extrabold text-gray-900 mb-2">{{ detailedMovie.title }}</h2>
          <div class="flex flex-wrap gap-2 mb-6">
            <span
              v-for="genre in detailedMovie.genres"
              :key="genre.id"
              class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
            >
              {{ genre.name }}
            </span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Overview</h3>
          <p class="text-gray-600 leading-relaxed">{{ detailedMovie.overview }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const { getPopularMovies, getMovieDetails, markAsWatched, queuePendingWatchedMovie, IMAGE_BASE } =
  useMovies()
const { isAuthenticated } = useAuth()

const movies = ref([])
const pending = ref(true)

const isDetailsOpen = ref(false)
const detailedMovie = ref(null)
const loadingDetails = ref(false)

const currentMovie = computed(() => movies.value[0] || null)

onMounted(async () => {
  try {
    const popular = await getPopularMovies()
    movies.value = popular
  } catch (error) {
    console.error(error)
  } finally {
    pending.value = false
  }
})

const handleDislike = () => {
  if (movies.value.length > 0) {
    movies.value.shift()
  }
}

const handleLike = async () => {
  if (!currentMovie.value) return

  const movieToSave = currentMovie.value

  movies.value.shift()

  if (isAuthenticated.value) {
    const status = await markAsWatched(movieToSave)
    if (status === 'unauthorized' || status === 'error') {
      queuePendingWatchedMovie(movieToSave)
    }
  } else {
    queuePendingWatchedMovie(movieToSave)
    router.push('/login')
  }
}

const openDetails = async (moviePreview) => {
  isDetailsOpen.value = true
  loadingDetails.value = true
  try {
    detailedMovie.value = await getMovieDetails(moviePreview.id)
  } catch (error) {
    console.error(error)
    isDetailsOpen.value = false
  } finally {
    loadingDetails.value = false
  }
}

const closeDetails = () => {
  isDetailsOpen.value = false
  setTimeout(() => {
    detailedMovie.value = null
  }, 300)
}
</script>
