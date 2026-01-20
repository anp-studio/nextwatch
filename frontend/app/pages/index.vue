<template>
  <div class="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
    <header class="p-4 flex justify-between items-center z-10">
      <h1 class="text-2xl font-bold tracking-tighter text-red-500">MovieMatch</h1>
      <div class="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-300">
        US English Mode
      </div>
    </header>

    <main class="flex-grow relative flex items-center justify-center w-full max-w-md mx-auto p-4">
      <div v-if="isFinished" class="text-center p-8 animate-fade-in">
        <div class="text-6xl mb-4">🎬</div>
        <h2 class="text-2xl font-bold mb-2">That's a wrap!</h2>
        <p class="text-slate-400 mb-6">You've gone through all recommended movies for now.</p>
        <button
          @click="resetDeck"
          class="bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-slate-200 transition"
        >
          Refresh Deck
        </button>
      </div>

      <div v-else class="relative w-full h-[65vh] md:h-[600px]">
        <div
          v-if="nextMovie"
          class="absolute inset-0 bg-slate-800 rounded-2xl transform scale-95 translate-y-4 opacity-50 z-0 pointer-events-none"
        >
          <img
            :src="nextMovie.posterUrl"
            class="w-full h-full object-cover rounded-2xl grayscale"
          />
        </div>

        <div
          ref="cardRef"
          class="absolute inset-0 bg-slate-800 rounded-2xl shadow-2xl z-10 cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden"
          :style="cardStyle"
        >
          <img
            :src="currentMovie.posterUrl"
            class="w-full h-full object-cover pointer-events-none"
          />

          <div
            class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"
          ></div>

          <div
            class="absolute top-8 left-8 border-4 border-green-500 text-green-500 rounded-lg px-4 py-1 font-bold text-4xl transform -rotate-12 opacity-0 transition-opacity"
            :style="{ opacity: yesOpacity }"
          >
            YES
          </div>
          <div
            class="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg px-4 py-1 font-bold text-4xl transform rotate-12 opacity-0 transition-opacity"
            :style="{ opacity: noOpacity }"
          >
            NO
          </div>
          <div
            class="absolute bottom-40 w-full text-center text-blue-400 font-bold text-2xl opacity-0 transition-opacity"
            :style="{ opacity: seenOpacity }"
          >
            ALREADY SEEN
          </div>

          <div class="absolute bottom-0 w-full p-6">
            <h2 class="text-4xl font-extrabold leading-none mb-2 shadow-black drop-shadow-md">
              {{ currentMovie.title }}
            </h2>

            <div class="flex items-center gap-2 mb-3">
              <span class="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded"
                >IMDb {{ currentMovie.imdbRating }}</span
              >
              <span class="text-sm text-slate-300">{{ currentMovie.year }}</span>
              <span class="text-sm text-slate-300">•</span>
              <span class="text-sm text-slate-300">{{ currentMovie.duration }} min</span>
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
              <span
                v-for="genre in currentMovie.genres"
                :key="genre"
                class="text-xs text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md"
              >
                {{ genre }}
              </span>
            </div>

            <button
              @click.stop="openDetails"
              class="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition absolute right-6 bottom-40"
            >
              <i class="text-white font-serif italic">i</i>
            </button>
          </div>
        </div>
      </div>
    </main>

    <footer v-if="!isFinished" class="p-6 flex justify-center gap-6 z-10 pb-8">
      <button
        @click="manualSwipe('left')"
        class="w-14 h-14 bg-slate-800 rounded-full text-red-500 shadow-lg flex items-center justify-center hover:scale-110 transition border border-slate-700"
      >
        <XIcon class="w-8 h-8" />
      </button>

      <button
        @click="manualSwipe('up')"
        class="w-10 h-10 mt-2 bg-slate-800 rounded-full text-blue-400 shadow-lg flex items-center justify-center hover:scale-110 transition border border-slate-700"
      >
        <EyeIcon class="w-5 h-5" />
      </button>

      <button
        @click="manualSwipe('right')"
        class="w-14 h-14 bg-slate-800 rounded-full text-green-500 shadow-lg flex items-center justify-center hover:scale-110 transition border border-slate-700"
      >
        <HeartIcon class="w-8 h-8 fill-current" />
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDraggable, useWindowSize } from '@vueuse/core'

const mockMovies = [
  {
    id: 1,
    title: 'Inception',
    year: 2010,
    duration: 148,
    imdbRating: 8.8,
    genres: ['Sci-Fi', 'Action'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/9gk7admal4OlWIuiCLtKG0Dbk9E.jpg',
    plot: 'A thief who steals corporate secrets through the use of dream-sharing technology...',
  },
  {
    id: 2,
    title: 'The Grand Budapest Hotel',
    year: 2014,
    duration: 99,
    imdbRating: 8.1,
    genres: ['Comedy', 'Adventure'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    plot: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years...',
  },
  {
    id: 3,
    title: 'Interstellar',
    year: 2014,
    duration: 169,
    imdbRating: 8.6,
    genres: ['Sci-Fi', 'Drama'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniL6C8zt6bF923eho96n49.jpg',
    plot: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
  },
]

const movies = ref([...mockMovies])
const currentIndex = ref(0)
const cardRef = ref(null)

const currentMovie = computed(() => movies.value[currentIndex.value])
const nextMovie = computed(() => movies.value[currentIndex.value + 1])
const isFinished = computed(() => currentIndex.value >= movies.value.length)

const { width: windowWidth } = useWindowSize()
const SWIPE_THRESHOLD = 100

const initialPosition = { x: 0, y: 0 }

const { position, isDragging } = useDraggable(cardRef, {
  initialValue: initialPosition,
  preventDefault: true,
  onEnd: (pos) => handleDragEnd(pos),
})

const cardStyle = computed(() => {
  if (isFinished.value) return {}

  const x = position.value.x - initialPosition.x
  const y = position.value.y - initialPosition.y

  const rotate = (x / (windowWidth.value / 2)) * 15

  return {
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
    transition: isDragging.value
      ? 'none'
      : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    cursor: isDragging.value ? 'grabbing' : 'grab',
  }
})

const likeOpacity = computed(() => {
  const x = position.value.x - initialPosition.x
  return x > 20 ? Math.min(x / 100, 1) : 0
})

const nopeOpacity = computed(() => {
  const x = position.value.x - initialPosition.x
  return x < -20 ? Math.min(Math.abs(x) / 100, 1) : 0
})

const seenOpacity = computed(() => {
  const y = position.value.y - initialPosition.y
  return y < -50 ? Math.min(Math.abs(y) / 100, 1) : 0
})

const handleDragEnd = () => {
  const x = position.value.x - initialPosition.x
  const y = position.value.y - initialPosition.y

  if (Math.abs(x) > SWIPE_THRESHOLD) {
    if (x > 0) processSwipe('right')
    else processSwipe('left')
  } else if (y < -SWIPE_THRESHOLD) {
    processSwipe('up')
  } else {
    position.value.x = initialPosition.x
    position.value.y = initialPosition.y
  }
}

const manualSwipe = (direction) => {
  let targetX = 0
  let targetY = 0

  if (direction === 'left') targetX = -500
  if (direction === 'right') targetX = 500
  if (direction === 'up') targetY = -500

  position.value = { x: targetX, y: targetY }

  setTimeout(() => {
    processSwipe(direction)
  }, 300)
}

const processSwipe = (direction) => {
  console.log(`User swiped: ${direction} on movie: ${currentMovie.value.title}`)

  // Poslati Supabease-u tj backendu (.json)

  setTimeout(() => {
    currentIndex.value++
    position.value = { ...initialPosition }
  }, 200)
}

const openDetails = () => {
  console.log('Open details modal')
}

const resetDeck = () => {
  currentIndex.value = 0
  position.value = { ...initialPosition }
}
</script>

<style>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>
