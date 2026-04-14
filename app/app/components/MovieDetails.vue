<template>
  <div
    v-if="isOpen && movie"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
    @click.self="closePanel"
  >
    <Transition name="modal" appear @after-leave="emit('close')">
      <div
        v-if="showPanel"
        class="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
      >
      <button
        @click="closePanel"
        class="absolute top-3 right-3 text-gray-700 dark:text-white bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 rounded-full p-2 z-10 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <div class="relative w-full pt-[56.25%] bg-black flex-shrink-0">
        <div
          v-if="trailerVideoId && !trailerFailed"
          :id="playerId"
          class="absolute top-0 left-0 w-full h-full"
        ></div>
        <img
          v-if="!trailerVideoId || trailerFailed"
          :src="movie.poster"
          :alt="movie.title"
          class="absolute top-0 left-0 w-full h-full object-cover"
        />
      </div>

      <div class="p-6 overflow-y-auto text-gray-900 dark:text-white">
        <h2 class="text-2xl sm:text-3xl font-bold mb-2">{{ movie.title }}</h2>

        <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span v-if="movie.year">{{ movie.year }}</span>
          <span v-if="movie.duration && movie.duration !== 'N/A'">{{ movie.duration }}</span>
          <span v-if="movie.rating" class="flex items-center gap-1 text-amber-500">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            {{ movie.rating }}
          </span>
        </div>

        <div v-if="movie.genres?.length" class="flex flex-wrap gap-2 mb-4">
          <span
            v-for="genre in movie.genres"
            :key="genre"
            class="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium"
          >
            {{ genre }}
          </span>
        </div>

        <div v-if="movie.actors?.length" class="mb-4">
          <h3
            class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1"
          >
            Cast
          </h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm">{{ movie.actors.join(', ') }}</p>
        </div>

        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">{{ movie.description }}</p>

        <div v-if="showAddButton" class="mt-6">
          <button
            v-if="isWatched"
            @click="$emit('remove')"
            class="group btn-press w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-500 hover:text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors"
            title="Remove from watched"
          >
            <svg
              class="w-5 h-5 text-green-500 group-hover:hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <svg
              class="w-5 h-5 hidden group-hover:inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span class="group-hover:hidden">Already Watched</span>
            <span class="hidden group-hover:inline">Remove from Watched</span>
          </button>
          <button
            v-else
            @click="$emit('add')"
            class="btn-press w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add to Watched
          </button>
        </div>
      </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import type { Movie } from '~/types/movie'
import {
  YOUTUBE_API_SCRIPT_ID,
  YOUTUBE_API_URL,
  YOUTUBE_PLAYER_ERROR_EMBEDDING,
  YOUTUBE_PLAYER_ERROR_RESTRICTED,
} from '~/constants'

import type { YouTubePlayerInstance, YouTubeWindow } from '~/types/youtube'

const props = defineProps<{
  isOpen: boolean
  movie: Movie | null
  showAddButton?: boolean
  isWatched?: boolean
}>()

const emit = defineEmits(['close', 'add', 'remove'])

const showPanel = ref(false)

watch(
  () => props.isOpen && !!props.movie,
  (visible) => {
    if (visible) {
      nextTick(() => { showPanel.value = true })
    }
  },
  { immediate: true }
)

function closePanel() {
  showPanel.value = false
}

const trailerFailed = ref(false)
let player: YouTubePlayerInstance | null = null
const playerId = `yt-player-${Math.random().toString(36).slice(2, 9)}`

const trailerVideoId = computed(() => {
  const trailer = props.movie?.trailer
  if (!trailer) return null
  const match = trailer.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
})

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve()
      return
    }

    const youtubeWindow = window as YouTubeWindow

    if (youtubeWindow.YT?.Player) {
      resolve()
      return
    }

    if (!document.getElementById(YOUTUBE_API_SCRIPT_ID)) {
      const tag = document.createElement('script')
      tag.id = YOUTUBE_API_SCRIPT_ID
      tag.src = YOUTUBE_API_URL
      document.head.appendChild(tag)
    }

    const existing = youtubeWindow.onYouTubeIframeAPIReady
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      existing?.()
      resolve()
    }
  })
}

function destroyPlayer() {
  if (!player) {
    return
  }

  try {
    player.destroy()
  } catch {
    // Ignore player teardown errors.
  }

  player = null
}

async function createPlayer(videoId: string) {
  destroyPlayer()
  await loadYouTubeAPI()
  await nextTick()

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  const container = document.getElementById(playerId)
  if (!container) return

  const youtubeWindow = window as YouTubeWindow
  const Player = youtubeWindow.YT?.Player
  if (!Player) return

  player = new Player(playerId, {
    videoId,
    width: '100%',
    height: '100%',
    playerVars: { autoplay: 0, modestbranding: 1, rel: 0 },
    events: {
      onError: (event) => {
        if (
          event.data === YOUTUBE_PLAYER_ERROR_EMBEDDING ||
          event.data === YOUTUBE_PLAYER_ERROR_RESTRICTED
        ) {
          trailerFailed.value = true
          destroyPlayer()
        }
      },
    },
  })
}

// Sync the embedded player with the selected movie while the modal is open.
watch(
  () => props.movie,
  async (movie) => {
    trailerFailed.value = false
    destroyPlayer()

    if (!movie) return

    const videoId = trailerVideoId.value
    if (!videoId) return

    await nextTick()
    createPlayer(videoId)
  },
  { immediate: true }
)

// Destroy the player when the modal closes to avoid leaking iframe state.
watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      destroyPlayer()
    }
  }
)

onBeforeUnmount(() => {
  destroyPlayer()
})
</script>
