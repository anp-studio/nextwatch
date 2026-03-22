<template>
  <div class="relative w-full h-full flex flex-col items-center justify-center p-4">
    <div v-if="moviesError" class="text-center">
      <h2 class="text-2xl font-bold mb-2">Unable to load movies</h2>
      <p class="text-gray-400">{{ moviesError }}</p>
      <button @click="reset" class="mt-4 text-red-500 hover:underline">Retry</button>
    </div>

    <div v-else-if="!movies || currentIndex >= movies.length" class="text-center">
      <h2 class="text-2xl font-bold mb-2">No more movies!</h2>
      <p class="text-gray-400">Come back later for more titles.</p>
      <button @click="reset" class="mt-4 text-red-500 hover:underline">Refresh</button>
    </div>

    <div v-else class="relative w-full max-w-sm aspect-[2/3]">
      <div
        v-for="(movie, index) in reversedMovies"
        :key="movie.id"
        class="absolute inset-0 w-full h-full bg-gray-800 rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-all duration-300"
        :style="getCardStyle(index)"
        @click="openDetails(movie)"
      >
        <img :src="movie.poster" class="w-full h-full object-cover" />

        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

        <div class="absolute bottom-0 left-0 w-full p-6 pb-24">
          <h1 class="text-3xl font-bold text-white drop-shadow-md">{{ movie.title }}</h1>
          <div class="flex items-center gap-2 text-gray-200 mt-2">
            <span class="bg-red-600 px-2 py-0.5 rounded text-xs font-bold"
              >{{ movie.rating }} TMDB</span
            >
            <span class="text-sm">{{ movie.genres.join(', ') }}</span>
          </div>
        </div>
      </div>

      <div class="absolute -bottom-8 left-0 w-full flex justify-center gap-8 z-50">
        <button
          @click.stop="handleSwipe('left')"
          class="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-red-500 shadow-lg border border-gray-700 hover:scale-110 transition-transform"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>

        <button
          class="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 hover:bg-red-500 transition-transform"
          @click.stop="handleSwipe('right')"
        >
          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        </button>
      </div>
    </div>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Movie, MoviePreview } from '~/types/movie'
const { getPopularMovies, getMovieDetails, markAsWatched, queuePendingWatchedMovie } = useMovies()

const moviesError = ref('')
const { data: movies, refresh } = await useAsyncData<MoviePreview[]>(
  'popular-movies',
  async () => {
    try {
      moviesError.value = ''
      return await getPopularMovies()
    } catch (error) {
      console.error('Failed to load home movies:', error)
      moviesError.value = 'Unable to load movies right now. Check the TMDB API configuration.'
      return []
    }
  },
  {
    default: () => [],
  }
)

const selectedMovie = ref<Movie | null>(null)
const currentIndex = ref(0)

const reversedMovies = computed(() => {
  if (!movies.value) return []
  return movies.value.slice(currentIndex.value, currentIndex.value + 2).reverse()
})

const getCardStyle = (index: number) => {
  const isTop = index === reversedMovies.value.length - 1
  return {
    transform: isTop ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
    opacity: isTop ? 1 : 0.5,
    zIndex: isTop ? 10 : 0,
  }
}

const handleSwipe = async (direction: 'left' | 'right') => {
  if (!movies.value || currentIndex.value >= movies.value.length) return
  const currentMovie = movies.value[currentIndex.value]
  if (!currentMovie) return

  if (direction === 'right') {
    const markResult = await markAsWatched({
      id: currentMovie.id,
      title: currentMovie.title,
      year: currentMovie.year,
      poster: currentMovie.poster,
    })

    if (markResult === 'unauthorized') {
      queuePendingWatchedMovie({
        id: currentMovie.id,
        title: currentMovie.title,
        year: currentMovie.year,
        poster: currentMovie.poster,
      })
      await navigateTo('/login')
      return
    }

    if (markResult !== 'ok') return
    // dodati animaciju? (trigger)
  } else {
    // preskakanje?
  }

  currentIndex.value++
}

const openDetails = async (movie: MoviePreview) => {
  try {
    const details = await getMovieDetails(movie.id)
    selectedMovie.value = details
  } catch (error) {
    console.error('Failed to load movie details:', error)
  }
}

const reset = async () => {
  currentIndex.value = 0
  await refresh()
}
</script>

