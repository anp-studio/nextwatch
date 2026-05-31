<template>
  <div
    class="[container-type:inline-size] flex h-full min-h-0 w-full flex-col justify-center gap-[clamp(0.25rem,3.5cqw,1rem)]"
  >
    <div
      ref="posterRef"
      class="relative w-full shrink-0 aspect-[1/1.5] [touch-action:pan-y]"
      :style="posterStyle"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <div
        v-if="posterStackCount >= 2"
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-outline opacity-30 [transform:translateX(-0.55rem)_rotate(-1.6deg)]"
        style="
          background-color: rgb(var(--color-surface-container-low));
          box-shadow:
            0 10px 26px rgb(0 0 0 / 0.2),
            0 0 0 1px rgb(255 255 255 / 0.03);
        "
        aria-hidden="true"
      ></div>
      <div
        v-if="posterStackCount >= 1"
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-outline opacity-40 [transform:translateX(0.55rem)_rotate(1.4deg)]"
        style="
          background-color: rgb(var(--color-surface-container-low));
          box-shadow:
            0 10px 26px rgb(0 0 0 / 0.2),
            0 0 0 1px rgb(255 255 255 / 0.03);
        "
        aria-hidden="true"
      ></div>

      <div
        class="relative z-10 w-full shrink-0 aspect-[1/1.5] overflow-hidden rounded-[1.125rem] border border-outline-variant bg-surface-container-low shadow-glow"
        :class="detailsEnabled ? 'cursor-pointer' : 'cursor-default'"
        @click="handleCardClick"
      >
        <img
          :src="movie.image"
          alt="Movie Poster"
          class="absolute inset-0 h-full w-full object-cover"
        />

        <div
          class="pointer-events-none absolute left-4 top-4 z-30 -rotate-12 rounded-lg border-2 border-primary bg-black/40 px-3 py-1 text-xl font-extrabold uppercase tracking-wider text-primary backdrop-blur-sm"
          :style="{ opacity: watchedOpacity }"
          aria-hidden="true"
        >
          Watched
        </div>
        <div
          class="pointer-events-none absolute right-4 top-4 z-30 rotate-12 rounded-lg border-2 border-primary bg-black/40 px-3 py-1 text-xl font-extrabold uppercase tracking-wider text-primary backdrop-blur-sm"
          :style="{ opacity: nopeOpacity }"
          aria-hidden="true"
        >
          No
        </div>
        <div
          class="pointer-events-none absolute left-1/2 bottom-16 z-30 -translate-x-1/2 rounded-lg border-2 border-primary bg-black/40 px-3 py-1 text-xl font-extrabold uppercase tracking-wider text-primary backdrop-blur-sm"
          :style="{ opacity: watchlistOpacity }"
          aria-hidden="true"
        >
          Watchlist
        </div>

        <div
          v-if="isInMyList || isWatched"
          class="absolute right-3 top-3 z-20 flex flex-col gap-1.5"
        >
          <div
            v-if="isWatched"
            class="flex h-[clamp(1.2rem,8.7cqw,2rem)] w-[clamp(1.2rem,8.7cqw,2rem)] items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
            title="Already watched"
          >
            <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>

          <div
            v-if="isInMyList"
            class="flex h-[clamp(1.2rem,8.7cqw,2rem)] w-[clamp(1.2rem,8.7cqw,2rem)] items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
            title="In My List"
          >
            <svg
              class="h-4 w-4 text-zinc-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
        </div>

        <div
          class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        ></div>

        <div
          v-if="formattedRating"
          class="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/80 px-2.5 py-1 text-[clamp(0.68rem,3.8cqw,0.9rem)] font-bold leading-none text-white shadow-lg backdrop-blur-md"
        >
          <svg
            class="h-[clamp(0.72rem,3.9cqw,0.92rem)] w-[clamp(0.72rem,3.9cqw,0.92rem)] text-amber-400 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.45))]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            />
          </svg>
          <span class="[text-shadow:0_1px_2px_rgb(0_0_0/0.65)]">{{ formattedRating }}</span>
        </div>
      </div>
    </div>

    <div class="w-full space-y-2">
      <div class="space-y-1">
        <div
          class="mb-[clamp(0.12rem,1.5cqw,0.4rem)] flex items-center justify-between gap-3 pb-[clamp(0.08rem,0.8cqw,0.18rem)]"
        >
          <h1
            class="truncate whitespace-nowrap flex-1 text-[clamp(1.05rem,8.25cqw,1.9rem)] font-bold leading-[1.14] tracking-[-0.03em] text-on-background"
            :title="movie.title"
          >
            {{ displayedTitle }}
          </h1>
          <span
            v-if="movie.year"
            class="shrink-0 text-[clamp(0.75rem,4.2cqw,0.98rem)] font-medium uppercase leading-none tracking-[0.08em] text-on-surface-variant opacity-90"
            >{{ movie.year }}</span
          >
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5 sm:gap-2">
        <span
          v-for="tag in genreTags"
          :key="tag"
          class="rounded-full border border-outline-variant bg-surface-container-low px-[clamp(0.18rem,1.5cqw,0.35rem)] py-[clamp(0.4rem,3.4cqw,0.78rem)] text-[clamp(0.48rem,2.95cqw,0.68rem)] font-semibold tracking-[0.16em] text-on-surface-variant [padding-inline:clamp(0.4rem,3.4cqw,0.78rem)] [padding-block:clamp(0.18rem,1.5cqw,0.35rem)]"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div
      class="flex shrink-0 items-center justify-center gap-[clamp(0.25rem,3.5cqw,1rem)] pt-[clamp(0rem,0.35cqw,0.1rem)]"
    >
      <button
        class="btn-press flex h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant transition-all hover:border-primary/40 hover:text-on-surface [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
        @click.stop="$emit('dislike', movie)"
      >
        <svg
          class="h-[clamp(0.9rem,6.7cqw,1.55rem)] w-[clamp(0.9rem,6.7cqw,1.55rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <button
        class="btn-press flex h-[clamp(2.7rem,20.4cqw,4.7rem)] w-[clamp(2.7rem,20.4cqw,4.7rem)] items-center justify-center rounded-full transition-all shadow-xl [box-shadow:0_0_0_1px_rgb(255_255_255/0.08),0_10px_24px_rgb(0_0_0/0.22),0_0_22px_rgb(255_255_255/0.08)]"
        :class="
          isInMyList
            ? 'bg-surface-container-highest text-on-background'
            : 'bg-primary text-on-primary hover:scale-105 hover:bg-primary/90'
        "
        @click.stop="$emit('to-watch', movie)"
      >
        <svg
          class="h-[clamp(1.05rem,8.25cqw,1.9rem)] w-[clamp(1.05rem,8.25cqw,1.9rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="isInMyList"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M5 13l4 4L19 7"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      <button
        class="btn-press flex h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] items-center justify-center rounded-full border transition-all [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
        :class="
          isWatched
            ? 'border-primary/10 bg-primary text-on-primary'
            : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
        "
        @click.stop="$emit('watched', movie)"
      >
        <svg
          class="h-[clamp(1.05rem,8.25cqw,1.9rem)] w-[clamp(1.05rem,8.25cqw,1.9rem)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>
    </div>

    <MovieDetails
      v-if="detailsEnabled"
      :is-open="isDetailsOpen"
      :movie="detailedMovie"
      @close="closeDetails"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const MAX_RATING = 10
const RATING_PRECISION = 1

const SWIPE_INTENT_PX = 10
const SWIPE_COMMIT_X_RATIO = 0.3
const SWIPE_COMMIT_Y_RATIO = 0.25
const SWIPE_FLICK_VELOCITY = 0.6

const props = defineProps({
  movie: {
    type: Object,
    required: true,
  },
  isInMyList: {
    type: Boolean,
    default: false,
  },
  isWatched: {
    type: Boolean,
    default: false,
  },
  posterStackCount: {
    type: Number,
    default: 0,
  },
  detailsEnabled: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['dislike', 'watched', 'to-watch', 'refresh'])

const { getMovieDetails } = useMovieDetails()

const posterRef = ref(null)
const dragX = ref(0)
const dragY = ref(0)
const isDragging = ref(false)
const isReleasing = ref(false)
const committed = ref(false)
const wasSwiping = ref(false)

let startX = 0
let startY = 0
let startTime = 0

const posterStyle = computed(() => {
  const rotate = dragX.value * 0.05
  return {
    transform: `translate(${dragX.value}px, ${dragY.value}px) rotate(${rotate}deg)`,
    transition: isDragging.value ? 'none' : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
    touchAction: isDragging.value ? 'none' : 'pan-y',
  }
})

const swipeDirection = computed(() => {
  const absX = Math.abs(dragX.value)
  const absY = Math.abs(dragY.value)
  if (absX < SWIPE_INTENT_PX && absY < SWIPE_INTENT_PX) return null
  if (absX >= absY) return dragX.value > 0 ? 'right' : 'left'
  return dragY.value < 0 ? 'up' : null
})

const posterWidth = () => posterRef.value?.offsetWidth || 1
const posterHeight = () => posterRef.value?.offsetHeight || 1

const nopeOpacity = computed(() =>
  swipeDirection.value === 'left'
    ? Math.min(1, Math.abs(dragX.value) / (posterWidth() * SWIPE_COMMIT_X_RATIO))
    : 0
)
const watchedOpacity = computed(() =>
  swipeDirection.value === 'right'
    ? Math.min(1, Math.abs(dragX.value) / (posterWidth() * SWIPE_COMMIT_X_RATIO))
    : 0
)
const watchlistOpacity = computed(() =>
  swipeDirection.value === 'up'
    ? Math.min(1, Math.abs(dragY.value) / (posterHeight() * SWIPE_COMMIT_Y_RATIO))
    : 0
)

const onTouchStart = (event) => {
  if (committed.value || event.touches.length !== 1) return
  const touch = event.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  startTime = event.timeStamp
  isDragging.value = true
  isReleasing.value = false
  wasSwiping.value = false
}

const onTouchMove = (event) => {
  if (!isDragging.value) return
  const touch = event.touches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (Math.abs(dy) > Math.abs(dx) && dy > 0 && !wasSwiping.value) {
    return
  }

  dragX.value = dx
  dragY.value = Math.min(dy, 0)

  if (Math.abs(dx) > SWIPE_INTENT_PX || dy < -SWIPE_INTENT_PX) {
    wasSwiping.value = true
    if (event.cancelable) event.preventDefault()
  }
}

const onTouchEnd = (event) => {
  if (!isDragging.value) return
  isDragging.value = false

  const dx = dragX.value
  const dy = dragY.value
  const elapsed = Math.max(1, event.timeStamp - startTime)
  const velocityX = Math.abs(dx) / elapsed
  const velocityY = Math.abs(dy) / elapsed

  const commitX = posterWidth() * SWIPE_COMMIT_X_RATIO
  const commitY = posterHeight() * SWIPE_COMMIT_Y_RATIO

  const direction = swipeDirection.value
  let action = null

  if (direction === 'left' && (Math.abs(dx) > commitX || velocityX > SWIPE_FLICK_VELOCITY)) {
    action = 'left'
  } else if (
    direction === 'right' &&
    (Math.abs(dx) > commitX || velocityX > SWIPE_FLICK_VELOCITY)
  ) {
    action = 'right'
  } else if (direction === 'up' && (Math.abs(dy) > commitY || velocityY > SWIPE_FLICK_VELOCITY)) {
    action = 'up'
  }

  if (action) {
    commitSwipe(action)
  } else {
    dragX.value = 0
    dragY.value = 0
  }
}

const commitSwipe = (direction) => {
  committed.value = true
  isReleasing.value = true

  const width = posterWidth()
  const height = posterHeight()
  if (direction === 'left') {
    dragX.value = -width * 1.3
  } else if (direction === 'right') {
    dragX.value = width * 1.3
  } else {
    dragY.value = -height * 1.3
  }

  const eventName =
    direction === 'left' ? 'dislike' : direction === 'right' ? 'watched' : 'to-watch'
  emit(eventName, props.movie)
}

const isDetailsOpen = ref(false)
const detailedMovie = ref(null)
const genreTags = computed(() => {
  if (typeof props.movie.genre !== 'string' || props.movie.genre.length === 0) {
    return ['Unknown']
  }

  return props.movie.genre
    .split(',')
    .map((genre) => genre.trim())
    .filter(Boolean)
    .slice(0, 3)
})
const formattedRating = computed(() => {
  const rating = props.movie.rating

  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) {
    return null
  }

  return `${rating.toFixed(RATING_PRECISION)}/${MAX_RATING}`
})
const displayedTitle = computed(() => truncateMovieTitle(props.movie.title))

const handleCardClick = () => {
  if (!props.detailsEnabled) {
    return
  }

  if (wasSwiping.value) {
    wasSwiping.value = false
    return
  }

  openDetails()
}

const openDetails = async () => {
  isDetailsOpen.value = true

  try {
    detailedMovie.value = await getMovieDetails(props.movie.id)
  } catch {
    isDetailsOpen.value = false
  }
}

const closeDetails = () => {
  isDetailsOpen.value = false
  setTimeout(() => {
    detailedMovie.value = null
  }, 300)
}

const TITLE_MAX_LENGTH = 34

function truncateMovieTitle(title) {
  if (typeof title !== 'string') {
    return ''
  }

  if (title.length <= TITLE_MAX_LENGTH) {
    return title
  }

  return `${title.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
}
</script>
