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
          :src="`${IMAGE_BASE}${movie.posterPath}`"
          class="w-20 h-28 object-cover rounded-lg flex-shrink-0"
        />
        <div class="flex flex-col justify-center">
          <h3 class="font-bold text-lg">{{ movie.title }}</h3>
          <p class="text-sm text-gray-400">{{ movie.year }}</p>
        </div>
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

const { IMAGE_BASE, watchedMovies, getMovieDetails } = useMovies()
const selectedMovie = ref<Movie | null>(null)

const openDetails = async (tmdbId: number) => {
  try {
    selectedMovie.value = await getMovieDetails(tmdbId)
  } catch (error) {
    console.error('Failed to load movie details:', error)
  }
}
</script>
