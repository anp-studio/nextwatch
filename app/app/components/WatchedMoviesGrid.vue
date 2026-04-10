<template>
  <div v-if="loading" class="w-full">
    <SkeletonWatchedGrid />
  </div>

  <div v-else class="w-full flex flex-col gap-10">
    <div class="w-full">
      <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
        Watched Movies
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{{
          movies.length
        }}</span>
      </h3>

      <div
        v-if="movies.length === 0"
        class="text-center text-gray-500 dark:text-gray-400 py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600"
      >
        You haven't marked any movies as watched yet.
      </div>

      <TransitionGroup
        v-else
        name="list"
        tag="div"
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6"
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-for="(movie, index) in movies"
          :key="movie.tmdbId"
          :data-index="index"
          @click="$emit('open-details', movie)"
          class="aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm relative group cursor-pointer transition-transform duration-200 hover:scale-[1.03]"
        >
          <img
            :src="posterUrl(movie.posterPath)"
            :alt="movie.title"
            class="w-full h-full object-cover"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3"
          >
            <div class="flex justify-end">
              <button
                @click.stop="$emit('remove', movie.tmdbId)"
                class="bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                title="Remove from watched"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <span
              class="text-sm sm:text-base text-white font-bold leading-tight line-clamp-2 drop-shadow-md"
              >{{ movie.title }}</span
            >
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WatchedMovie } from '~/types/movie'

defineProps<{ movies: WatchedMovie[]; loading: boolean }>()
defineEmits<{ 'open-details': [movie: WatchedMovie]; 'remove': [tmdbId: number] }>()

const onBeforeEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'translateY(20px)'
}
const onEnter = (el: Element, done: () => void) => {
  const htmlEl = el as HTMLElement
  const delay = Math.min(Number(htmlEl.dataset.index) * 50, 500)
  htmlEl.style.transition = `opacity 300ms ease ${delay}ms, transform 300ms ease ${delay}ms`
  void htmlEl.offsetHeight
  htmlEl.style.opacity = '1'
  htmlEl.style.transform = 'translateY(0)'
  setTimeout(done, 300 + delay)
}
const onLeave = (_el: Element, done: () => void) => {
  done()
}
</script>
