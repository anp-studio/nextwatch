<template>
  <div
    class="relative flex cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border border-outline-variant bg-surface-container-low shadow-glow transition-transform duration-200 hover:scale-[1.02]"
    @click="$emit('details', movie)"
  >
    <div class="relative aspect-[2/3] bg-surface-container-high">
      <img
        v-if="movie.poster_path"
        :src="posterUrl(movie.poster_path)"
        :alt="movie.title"
        class="h-full w-full object-cover"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-xs text-outline">
        No image
      </div>

      <div
        class="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm"
      >
        <svg class="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
        {{ movie.vote_average?.toFixed(1) || 'N/A' }}
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-between p-3">
      <div>
        <h3 class="mb-1 line-clamp-1 text-sm font-bold text-on-surface">
          {{ movie.title }}
        </h3>
        <p class="mb-3 text-xs text-on-surface-variant">
          {{ movie.release_date ? movie.release_date.split('-')[0] : 'Unknown' }}
        </p>
      </div>

      <div class="flex gap-2">
        <button
          v-if="isWatched"
          class="group flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface-container-high py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-red-500 hover:text-white"
          title="Remove from watched"
          @click.stop="$emit('remove', movie)"
        >
          <svg
            class="w-4 h-4 text-green-500 group-hover:hidden"
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
          <svg
            class="w-4 h-4 hidden group-hover:inline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
          <span class="group-hover:hidden">Watched</span>
          <span class="hidden group-hover:inline">Remove</span>
        </button>
        <button
          v-else
          class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary/90"
          @click.stop="$emit('add', movie)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          Watched
        </button>
        <button
          class="flex items-center justify-center rounded-lg px-2 py-2 transition-colors"
          :class="
            isWatched
              ? 'cursor-not-allowed bg-surface-container-high text-outline'
              : isInMyList
                ? 'bg-primary text-on-primary hover:bg-primary/90'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
          "
          :title="
            isWatched ? 'Already in watched' : isInMyList ? 'Remove from My List' : 'Add to My List'
          "
          :disabled="isWatched"
          @click.stop="$emit('toggle-mylist', movie)"
        >
          <svg
            class="h-4 w-4"
            :fill="isInMyList ? 'currentColor' : 'none'"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  movie: { type: Object, required: true },
  isWatched: { type: Boolean, required: true },
  isInMyList: { type: Boolean, required: true },
})
defineEmits(['add', 'remove', 'details', 'toggle-mylist'])
</script>
