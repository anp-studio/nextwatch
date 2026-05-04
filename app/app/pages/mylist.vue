<template>
  <div
    class="h-full min-h-0 overflow-y-auto bg-background px-4 pb-24 pt-6 text-on-background sm:px-6 lg:px-8"
  >
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section class="flex flex-col gap-6">
        <div
          class="flex flex-col gap-4 border-l-2 border-[#ffffff] pl-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="space-y-2">
            <div class="space-y-2">
              <h1
                class="text-3xl font-semibold uppercase tracking-[-0.04em] text-white sm:text-3xl"
              >
                Your Watchlist
              </h1>
              <p class="max-w-2xl text-sm text-[#c4c7c8]">
                Pick up where discovery left off. Mark titles as watched, remove them, or open any
                card for full details.
              </p>
            </div>
          </div>

          <div
            class="inline-flex w-fit items-center gap-2 rounded-full border border-[#444748] bg-[#1c1b1b] px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-[#c4c7c8]"
          >
            <span class="h-2 w-2 rounded-full bg-white"></span>
            {{ movieCountLabel }}
          </div>
        </div>

        <div
          v-if="!hasMovies"
          class="rounded-[1.75rem] border border-dashed border-[#444748] bg-[#1c1b1b] px-6 py-14 text-center shadow-[0_24px_56px_rgb(0_0_0/0.5)]"
        >
          <p class="text-2xl font-semibold text-white">Your watchlist is empty</p>
          <p class="mx-auto mt-3 max-w-md text-sm text-[#c4c7c8]">
            Add movies from discovery to build a queue worth coming back to.
          </p>
          <NuxtLink
            to="/"
            class="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200"
          >
            Go to Discovery
          </NuxtLink>
        </div>

        <TransitionGroup
          v-else
          name="watchlist"
          tag="div"
          class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4 xl:grid-cols-5"
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
        >
          <MyListMovieCard
            v-for="(movie, index) in myList"
            :key="movie.tmdbId"
            :movie="movie"
            :data-index="index"
            @open="openDetails"
            @mark-watched="handleMarkWatched"
            @remove="handleRemove"
          />
        </TransitionGroup>
      </section>
    </div>

    <MovieDetails
      v-if="selectedMovie"
      :is-open="!!selectedMovie"
      :movie="selectedMovie"
      @close="selectedMovie = null"
    />

    <Transition name="fade">
      <div
        v-if="undoAction"
        class="fixed bottom-24 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-800 bg-black px-5 py-3 text-zinc-200 shadow-glow"
      >
        <span class="truncate text-sm">
          <strong>{{ undoAction.movie.title }}</strong>
          {{ undoAction.type === 'watched' ? 'marked as watched' : 'removed from your watchlist' }}
        </span>
        <button
          class="whitespace-nowrap text-sm font-semibold text-white transition-colors hover:text-zinc-300"
          @click="handleUndo"
        >
          Undo
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Movie, MyListMovie } from '~/types/movie'

const UNDO_TIMEOUT_MS = 5000

const { myList, removeFromMyList, addToMyList } = useMyList()
const { markAsWatched, removeFromWatched } = useWatchedMovies()
const { getMovieDetails: fetchMovieDetails } = useMovieDetails()

const selectedMovie = ref<Movie | null>(null)
const undoAction = ref<{ movie: MyListMovie; type: 'watched' | 'removed' } | null>(null)
const hasMovies = computed(() => myList.value.length > 0)
const movieCountLabel = computed(() => {
  const count = myList.value.length
  const noun = count === 1 ? 'item' : 'items'

  return `${count} ${noun}`
})

let undoTimer: ReturnType<typeof setTimeout> | null = null

const dismissUndo = () => {
  if (undoTimer) {
    clearTimeout(undoTimer)
  }

  undoTimer = null
  undoAction.value = null
}

const showUndo = (movie: MyListMovie, type: 'watched' | 'removed') => {
  dismissUndo()
  undoAction.value = { movie: { ...movie }, type }
  undoTimer = setTimeout(dismissUndo, UNDO_TIMEOUT_MS)
}

const handleRemove = async (movie: MyListMovie) => {
  dismissUndo()
  const status = await removeFromMyList(movie.tmdbId)

  if (status !== 'ok') {
    return
  }

  showUndo(movie, 'removed')
}

const handleMarkWatched = async (movie: MyListMovie) => {
  dismissUndo()
  const status = await markAsWatched({
    id: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    poster: movie.posterPath,
  })

  if (status !== 'ok') {
    return
  }

  showUndo(movie, 'watched')
}

const handleUndo = async () => {
  const action = undoAction.value

  if (!action) {
    return
  }

  dismissUndo()

  if (action.type === 'watched') {
    const status = await removeFromWatched(action.movie.tmdbId)

    if (status !== 'ok') {
      return
    }
  }

  await addToMyList({
    id: action.movie.tmdbId,
    title: action.movie.title,
    year: action.movie.year,
    poster: action.movie.posterPath,
    genres: action.movie.genres,
    runtime: action.movie.runtime,
  })
}

const openDetails = async (tmdbId: number) => {
  try {
    selectedMovie.value = await fetchMovieDetails(tmdbId)
  } catch {
    // Leave the modal closed when details cannot be loaded.
  }
}

const onBeforeEnter = (element: Element) => {
  const htmlElement = element as HTMLElement
  htmlElement.style.opacity = '0'
  htmlElement.style.transform = 'translateY(24px)'
}

const onEnter = (element: Element, done: () => void) => {
  const htmlElement = element as HTMLElement
  const delay = Math.min(Number(htmlElement.dataset.index ?? 0) * 45, 360)

  htmlElement.style.transition = `opacity 280ms ease ${delay}ms, transform 280ms ease ${delay}ms`
  void htmlElement.offsetHeight
  htmlElement.style.opacity = '1'
  htmlElement.style.transform = 'translateY(0)'

  setTimeout(done, 280 + delay)
}

const onLeave = (_element: Element, done: () => void) => {
  done()
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.watchlist-move,
.watchlist-enter-active,
.watchlist-leave-active {
  transition:
    transform 0.28s ease,
    opacity 0.28s ease;
}

.watchlist-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.watchlist-leave-active {
  position: absolute;
}
</style>
