<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none"
  >
    <div
      @click="close"
      class="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
    ></div>

    <div
      class="relative w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 h-[85vh] sm:h-auto overflow-y-auto pointer-events-auto shadow-2xl transform transition-transform duration-300"
    >
      <button
        @click="close"
        class="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <div class="flex flex-col items-center mb-6">
        <img
          :src="movie.poster"
          :alt="movie.title"
          class="w-32 h-48 object-cover rounded-lg shadow-lg mb-4"
        />
        <h2 class="text-2xl font-bold text-center text-white">{{ movie.title }}</h2>
        <div class="flex items-center gap-2 mt-2 text-gray-400 text-sm">
          <span class="border border-gray-600 px-2 py-0.5 rounded">{{ movie.year }}</span>
          <span>{{ movie.duration }}</span>
          <span class="flex items-center text-yellow-400"> ★ {{ movie.rating }} </span>
        </div>
      </div>

      <div class="space-y-4">
        <div>
          <h3 class="text-gray-400 text-sm uppercase tracking-wide">Plot</h3>
          <p class="text-gray-200 mt-1 leading-relaxed">{{ movie.description }}</p>
        </div>

        <div>
          <h3 class="text-gray-400 text-sm uppercase tracking-wide">Cast</h3>
          <div class="flex flex-wrap gap-2 mt-1">
            <span
              v-for="actor in movie.actors"
              :key="actor"
              class="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm"
            >
              {{ actor }}
            </span>
          </div>
        </div>

        <div>
          <h3 class="text-gray-400 text-sm uppercase tracking-wide mb-2">My Notes</h3>
          <textarea
            class="w-full bg-gray-800 text-white rounded p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
            rows="3"
            placeholder="Write your thoughts after watching..."
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Movie } from '~/types/movie'

defineProps<{
  isOpen: boolean
  movie: Movie
}>()

const emit = defineEmits(['close'])
const close = () => emit('close')
</script>
