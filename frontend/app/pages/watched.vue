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
        :key="movie.id"
        class="flex bg-gray-800 rounded-xl p-3 gap-3"
      >
        <img :src="movie.poster" class="w-20 h-28 object-cover rounded-lg flex-shrink-0" />
        <div class="flex flex-col justify-center">
          <h3 class="font-bold text-lg">{{ movie.title }}</h3>
          <div class="flex items-center text-yellow-400 text-sm mb-1">
            <span class="mr-1">★</span> {{ movie.rating }}
          </div>
          <p class="text-xs text-gray-400 line-clamp-2">{{ movie.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { watchedMovies } = useMovies()
</script>
