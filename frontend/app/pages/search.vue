<template>
  <div class="p-4 pt-10">
    <h1 class="text-3xl font-bold mb-6">Search</h1>

    <div class="relative mb-6">
      <input
        v-model="query"
        type="text"
        placeholder="Find movies, actors, genres..."
        class="w-full bg-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-gray-500"
      />
      <svg
        class="w-5 h-5 text-gray-500 absolute left-3 top-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        ></path>
      </svg>
    </div>

    <div v-if="loadError" class="rounded-xl bg-red-900/60 text-red-200 p-4 mb-6">
      {{ loadError }}
    </div>

    <div v-else-if="isLoading" class="text-center text-gray-400 mt-20">Loading movies...</div>

    <div v-else class="grid grid-cols-2 gap-4">
      <div
        v-for="movie in filteredMovies"
        :key="movie.id"
        class="bg-gray-800 rounded-xl overflow-hidden"
      >
        <img :src="movie.poster" class="w-full h-40 object-cover" />
        <div class="p-3">
          <h3 class="font-bold text-sm truncate">{{ movie.title }}</h3>
          <p class="text-xs text-gray-400">{{ movie.year }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MoviePreview } from '~/types/movie'

const { getPopularMovies } = useMovies()
const query = ref('')
const movies = ref<MoviePreview[]>([])
const isLoading = ref(false)
const loadError = ref('')

onMounted(async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    movies.value = await getPopularMovies()
  } catch (error) {
    console.error('Failed to load search movies:', error)
    loadError.value = 'Unable to load movies right now. Check the TMDB API configuration.'
    movies.value = []
  } finally {
    isLoading.value = false
  }
})

const filteredMovies = computed(() => {
  if (!query.value) return movies.value

  return movies.value.filter(
    (m: MoviePreview) =>
      m.title.toLowerCase().includes(query.value.toLowerCase()) ||
      m.genres.some((g: string) => g.toLowerCase().includes(query.value.toLowerCase()))
  )
})
</script>
