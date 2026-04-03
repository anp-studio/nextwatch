<template>
  <div class="p-4 pt-10">
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
        class="flex bg-gray-800 rounded-xl p-3 gap-3 justify-between items-center"
      >
        <div class="flex gap-3 flex-1 cursor-pointer" @click="openDetails(movie.tmdbId)">
          <img
            :src="`${IMAGE_BASE}${movie.posterPath}`"
            class="w-20 h-28 object-cover rounded-lg flex-shrink-0"
          />
          <div class="flex flex-col justify-center">
            <h3 class="font-bold text-lg">{{ movie.title }}</h3>
            <p class="text-sm text-gray-400">{{ movie.year }}</p>
          </div>
        </div>
        <button
          class="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-2"
          @click.stop="unmarkAsWatched(movie.tmdbId)"
          title="Remove from watched"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
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
import type { Movie } from '~/types/movie'

const { IMAGE_BASE, watchedMovies, getMovieDetails, unmarkAsWatched } = useMovies()
const selectedMovie = ref<Movie | null>(null)

const openDetails = async (tmdbId: number) => {
  try {
    selectedMovie.value = await getMovieDetails(tmdbId)
  } catch (error) {
    console.error('Failed to load movie details:', error)
  }
}
</script>
