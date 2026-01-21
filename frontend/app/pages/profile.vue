<template>
  <div class="p-4 pt-10">
    <div class="flex flex-col items-center mb-8">
      <div
        class="w-24 h-24 bg-gradient-to-tr from-red-500 to-orange-500 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-lg"
      >
        JD
      </div>
      <h2 class="text-2xl font-bold">John Doe</h2>
      <p class="text-gray-400">Movie Enthusiast</p>
    </div>

    <div class="grid grid-cols-2 gap-4 mb-8">
      <div class="bg-gray-800 p-4 rounded-2xl text-center">
        <p class="text-3xl font-bold text-white">{{ watchedMovies.length }}</p>
        <p class="text-gray-400 text-sm">Movies Watched</p>
      </div>
      <div class="bg-gray-800 p-4 rounded-2xl text-center">
        <p class="text-3xl font-bold text-white">42</p>
        <p class="text-gray-400 text-sm">Hours Total</p>
      </div>
    </div>

    <div class="bg-gray-800 rounded-2xl p-6">
      <h3 class="font-bold mb-4 border-b border-gray-700 pb-2">Preferences</h3>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-400">Favorite Genre</span>
          <span>Sci-Fi</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Avg. Rating Given</span>
          <span>8.2</span>
        </div>
      </div>
    </div>

    <button
      class="w-full mt-8 py-3 bg-red-600/20 text-red-500 rounded-xl font-bold hover:bg-red-600/30 transition"
    >
      Log Out
    </button>
  </div>
</template>

<script setup lang="ts">
const { watchedMovies } = useMovies()
</script>
