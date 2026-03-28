<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-md bg-gray-900">
    <img
      :src="movie.image"
      alt="Movie Poster"
      class="absolute inset-0 w-full h-full object-cover"
    />

    <div class="absolute inset-x-0 top-0 flex gap-1 p-2 z-10">
      <div class="h-1 flex-1 bg-white/50 rounded-full overflow-hidden">
        <div class="h-full w-1/3 bg-white rounded-full"></div>
      </div>
      <div class="h-1 flex-1 bg-white/50 rounded-full overflow-hidden"></div>
      <div class="h-1 flex-1 bg-white/50 rounded-full overflow-hidden"></div>
    </div>

    <div
      class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-0"
    ></div>

    <div class="absolute bottom-0 left-0 w-full p-4 text-white z-10">
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-bold flex items-baseline gap-2">
            {{ movie.title }} <span class="text-xl font-normal">{{ movie.year }}</span>
          </h1>
          <div class="flex items-center gap-2 mt-2 text-sm opacity-90">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              ></path>
            </svg>
            <span>{{ movie.genre }}</span>
          </div>
          <div class="flex items-center gap-2 mt-1 text-sm opacity-90">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
            <span>Dir. {{ movie.director }}</span>
          </div>
        </div>
        <button
          class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm mb-1 hover:bg-white/30 transition-colors cursor-pointer pointer-events-auto"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  movie: {
    type: Object,
    required: true,
  },
})
</script>
