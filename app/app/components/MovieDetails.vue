<template>
  <div
    v-if="isOpen && movie"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-6 backdrop-blur-sm"
    @click.self="closePanel"
  >
    <Transition name="modal" appear @after-leave="emit('close')">
      <div
        v-if="showPanel"
        class="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <button
          class="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/60 p-2 text-zinc-300 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
          @click="closePanel"
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

        <div class="relative w-full flex-shrink-0 bg-black pt-[56.25%]">
          <div
            v-if="trailerVideoId && !trailerFailed"
            :id="playerId"
            class="absolute left-0 top-0 h-full w-full"
          ></div>
          <img
            v-if="(!trailerVideoId || trailerFailed) && fallbackImageSource"
            :src="fallbackImageSource"
            :alt="movie.title"
            class="absolute left-0 top-0 h-full w-full object-cover"
          />
        </div>

        <div class="overflow-y-auto p-6 text-white">
          <h2 class="mb-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">{{ movie.title }}</h2>

          <div class="mb-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span v-if="movie.year">{{ movie.year }}</span>
            <span v-if="movie.duration && movie.duration !== 'N/A'">{{ movie.duration }}</span>
            <span
              v-if="formattedRating"
              class="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2.5 py-1 text-sm font-bold leading-none text-white shadow-lg backdrop-blur-md"
            >
              <svg
                class="h-4 w-4 text-amber-400 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.45))]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                />
              </svg>
              <span class="[text-shadow:0_1px_2px_rgb(0_0_0/0.65)]">{{ formattedRating }}</span>
            </span>
          </div>

          <div v-if="movie.genres?.length" class="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
            <span
              v-for="genre in movie.genres"
              :key="genre"
              class="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-zinc-400"
            >
              {{ genre }}
            </span>
          </div>

          <div v-if="movie.directors?.length" class="mb-4">
            <h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {{ movie.directors.length > 1 ? 'Directors' : 'Director' }}
            </h3>
            <p class="text-sm text-zinc-300">{{ movie.directors.join(', ') }}</p>
          </div>

          <div v-if="movie.actors?.length" class="mb-4">
            <h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">Cast</h3>
            <p class="text-sm text-zinc-300">{{ movie.actors.join(', ') }}</p>
          </div>

          <p class="leading-relaxed text-zinc-300">{{ movie.description }}</p>

          <div v-if="showAddButton" class="mt-6 flex flex-col gap-3">
            <div class="flex gap-3">
              <button
                v-if="isWatched"
                class="group btn-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-bold text-zinc-400 transition-colors hover:border-white hover:bg-black hover:text-white"
                title="Remove from watched"
                @click="$emit('remove')"
              >
                <svg
                  class="h-5 w-5 text-white group-hover:hidden"
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
                  class="hidden h-5 w-5 group-hover:inline"
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
                class="btn-press flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-zinc-200"
                @click="$emit('add')"
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
              <button
                v-if="showMyListButton"
                class="btn-press flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors"
                :class="
                  isInMyList
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-white hover:text-white'
                "
                :title="isInMyList ? 'Remove from My List' : 'Add to My List'"
                @click="$emit('toggle-mylist')"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
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
  showMyListButton?: boolean
  isInMyList?: boolean
}>()

const emit = defineEmits(['close', 'add', 'remove', 'toggle-mylist'])

const showPanel = ref(false)

watch(
  () => props.isOpen && !!props.movie,
  (visible) => {
    if (visible) {
      nextTick(() => {
        showPanel.value = true
      })
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

const fallbackImageSource = computed(() => {
  const movie = props.movie
  if (!movie) return ''

  return movie.backdrop || movie.poster
})

const formattedRating = computed(() => {
  const rating = props.movie?.rating

  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) {
    return null
  }

  return `${rating.toFixed(1)}/10`
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
