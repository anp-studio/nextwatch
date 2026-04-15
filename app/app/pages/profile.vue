<template>
  <div class="p-6 h-full flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-900 relative">
    <div v-if="user" class="flex flex-col items-center w-full min-h-full pb-20">
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
  </div>
</template>

<script setup>
import { ref } from 'vue'

const { user } = useAuth()
const { watchedMovies, removeFromWatched } = useWatchedMovies()
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

const handleRemove = async (tmdbId) => {
  await removeFromWatched(tmdbId)
}

const closeMovieDetails = () => {
  isModalOpen.value = false
  selectedMovie.value = null
}
</script>
