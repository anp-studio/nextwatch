<template>
  <div class="p-6 h-full flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-900 relative">
    <div v-if="user" class="flex flex-col items-center w-full min-h-full pb-20">
      <UserProfileHeader />
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
const { getMovieDetails } = useMovieDetails()

const loading = ref(false)

const isModalOpen = ref(false)
const selectedMovie = ref(null)

const openMovieDetails = async (movie) => {
  try {
    selectedMovie.value = await getMovieDetails(movie.tmdbId)
    isModalOpen.value = true
  } catch (error) {
    console.error('Failed to load movie details:', error)
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
