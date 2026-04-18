<template>
  <div class="pt-6 pl-6 pb-6 h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
    <div v-if="user" class="flex flex-col items-center w-full min-h-full overflow-y-auto pb-20 pr-6">
      <UserProfileHeader />
      <NuxtLink
        to="/mylist"
        class="w-full flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6 transition-colors"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="font-semibold text-gray-900 dark:text-white">My List</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ myList.length }} movies to watch</span>
          </div>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </NuxtLink>
      <WatchedMoviesGrid
        :movies="watchedMovies"
        :loading="loading"
        @open-details="openMovieDetails"
        @remove="handleRemove"
      />
    </div>

    <div v-else class="flex-1 flex flex-col justify-center h-full">
      <AuthForm />
    </div>

    <MovieDetails :is-open="isModalOpen" :movie="selectedMovie" @close="closeMovieDetails" />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-800 dark:bg-gray-700 text-white rounded-full px-5 py-3 shadow-lg flex items-center gap-3 max-w-sm"
      >
        <span class="text-sm truncate">
          <strong>{{ undoAction.title }}</strong> removed from Watched
        </span>
        <button
          @click="handleUndo"
          class="text-rose-400 hover:text-rose-300 font-semibold text-sm whitespace-nowrap transition-colors"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { user } = useAuth()
const { watchedMovies, removeFromWatched, markAsWatched } = useWatchedMovies()
const { myList } = useMyList()
const { getMovieDetails } = useMovieDetails()

const loading = ref(false)

const isModalOpen = ref(false)
const selectedMovie = ref(null)

const openMovieDetails = async (movie) => {
  try {
    selectedMovie.value = await getMovieDetails(movie.tmdbId)
    isModalOpen.value = true
  } catch {
    // failed to load movie details
  }
}

const undoAction = ref(null)
let undoTimer = null

const dismissUndo = () => {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction.value = null
}

const handleRemove = async (tmdbId) => {
  dismissUndo()
  const movie = watchedMovies.value.find((m) => m.tmdbId === tmdbId)
  await removeFromWatched(tmdbId)
  if (movie) {
    undoAction.value = { ...movie }
    undoTimer = setTimeout(dismissUndo, 5000)
  }
}

const handleUndo = async () => {
  const movie = undoAction.value
  if (!movie) return
  dismissUndo()
  await markAsWatched({
    id: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    poster: movie.posterPath,
    genres: movie.genres,
    runtime: movie.runtime,
  })
}

const closeMovieDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}
</script>
