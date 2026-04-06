<template>
  <div class="p-4 pt-10 text-gray-900 dark:text-white">
    <div class="flex justify-between items-end mb-6">
      <h1 class="text-3xl font-bold">Already Watched</h1>
      <span class="text-gray-400 text-sm">{{ watchedMovies.length }} movies</span>
    </div>

    <div v-if="watchedMovies.length === 0" class="text-center text-gray-500 mt-20">
      <p>You haven't marked any movies yet.</p>
      <NuxtLink to="/" class="text-red-500 mt-2 inline-block">Go to Home</NuxtLink>
    </div>

    <div class="space-y-4">
      <div
        v-for="movie in watchedMovies"
        :key="movie.tmdbId"
        class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-3 gap-3"
        @click="openDetails(movie.tmdbId)"
      >
        <img
          :src="posterUrl(movie.posterPath)"
          class="w-20 h-28 object-cover rounded-lg flex-shrink-0"
        />
        <div class="flex flex-col justify-center flex-1 min-w-0">
          <h3 class="font-bold text-lg">{{ movie.title }}</h3>
          <p class="text-sm text-gray-400">{{ movie.year }}</p>
        </div>
        <button
          @click.stop="handleRemove(movie.tmdbId)"
          class="self-center flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-2"
          title="Remove from watched"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
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
import type { Movie } from '~/types/movie'

const { watchedMovies, removeFromWatched } = useWatchedMovies()
const { getMovieDetails } = useMovieDetails()
const selectedMovie = ref<Movie | null>(null)

const handleRemove = async (tmdbId: number) => {
  await removeFromWatched(tmdbId)
}

const openDetails = async (tmdbId: number) => {
  try {
    selectedMovie.value = await getMovieDetails(tmdbId)
  } catch {
    // failed to load movie details
  }
}
</script>
