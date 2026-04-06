<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative cursor-pointer"
    @click="$emit('details', movie)"
  >
    <div class="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative">
      <img
        v-if="movie.poster_path"
        :src="posterUrl(movie.poster_path)"
        :alt="movie.title"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-400 text-xs"
      >
        No image
      </div>

      <div
        class="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1"
      >
        <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
        {{ movie.vote_average?.toFixed(1) || 'N/A' }}
      </div>
    </div>

    <div class="p-3 flex flex-col flex-1 justify-between">
      <div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">{{ movie.title }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {{ movie.release_date ? movie.release_date.split('-')[0] : 'Unknown' }}
        </p>
      </div>

      <button
        v-if="isWatched"
        disabled
        @click.stop
        class="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg text-xs font-bold flex justify-center items-center gap-1 cursor-not-allowed"
      >
        <svg
          class="w-4 h-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
        Watched
      </button>
      <button
        v-else
        @click.stop="$emit('add', movie)"
        class="w-full py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-colors rounded-lg text-xs font-bold flex justify-center items-center gap-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          ></path>
        </svg>
        Add
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  movie: { type: Object, required: true },
  isWatched: { type: Boolean, required: true },
})
defineEmits(['add', 'details'])
</script>
