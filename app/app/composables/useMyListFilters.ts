import type { MyListMovie } from '~/types/movie'
import {
  RUNTIME_RANGES,
  type RuntimeRange,
  type SortOption,
} from '~/composables/useWatchedFilters'

const METADATA_BATCH_SIZE = 5
const SEARCH_RESULT_SORT_DEFAULT: SortOption = 'default'

export const MY_LIST_SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  'title-asc': 'Title A-Z',
  'title-desc': 'Title Z-A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

export const useMyListFilters = (myList: Ref<MyListMovie[]>) => {
  const { getMovieDetails } = useMovieDetails()

  const searchQuery = ref('')
  const selectedGenres = ref<string[]>([])
  const selectedRuntime = ref<RuntimeRange | null>(null)
  const sortBy = ref<SortOption>(SEARCH_RESULT_SORT_DEFAULT)

  const enrichedMap = ref<Record<number, { genres: string[]; runtime: number | null }>>({})
  const isLoadingMetadata = ref(false)
  const metadataProgress = ref({ loaded: 0, total: 0 })

  const getGenres = (movie: MyListMovie): string[] => {
    return movie.genres ?? enrichedMap.value[movie.tmdbId]?.genres ?? []
  }

  const getRuntime = (movie: MyListMovie): number | null => {
    return movie.runtime ?? enrichedMap.value[movie.tmdbId]?.runtime ?? null
  }

  const availableGenres = computed(() => {
    const genreSet = new Set<string>()

    for (const movie of myList.value) {
      for (const genre of getGenres(movie)) {
        genreSet.add(genre)
      }
    }

    return [...genreSet].sort()
  })

  const filteredMovies = computed(() => {
    let result = [...myList.value]

    if (searchQuery.value.trim()) {
      const normalizedQuery = searchQuery.value.trim().toLowerCase()
      result = result.filter((movie) => movie.title.toLowerCase().includes(normalizedQuery))
    }

    if (selectedGenres.value.length > 0) {
      result = result.filter((movie) => {
        const genres = getGenres(movie)
        return selectedGenres.value.some((genre) => genres.includes(genre))
      })
    }

    if (selectedRuntime.value) {
      const { min, max } = selectedRuntime.value
      result = result.filter((movie) => {
        const runtime = getRuntime(movie)

        if (runtime === null) {
          return false
        }

        return runtime >= min && runtime <= max
      })
    }

    if (sortBy.value !== SEARCH_RESULT_SORT_DEFAULT) {
      result.sort((firstMovie, secondMovie) => {
        switch (sortBy.value) {
          case 'title-asc':
            return firstMovie.title.localeCompare(secondMovie.title)
          case 'title-desc':
            return secondMovie.title.localeCompare(firstMovie.title)
          case 'year-desc':
            return secondMovie.year - firstMovie.year
          case 'year-asc':
            return firstMovie.year - secondMovie.year
          default:
            return 0
        }
      })
    }

    return result
  })

  const hasActiveFilters = computed(() => {
    return (
      searchQuery.value.trim() !== '' ||
      selectedGenres.value.length > 0 ||
      selectedRuntime.value !== null ||
      sortBy.value !== SEARCH_RESULT_SORT_DEFAULT
    )
  })

  const clearFilters = () => {
    searchQuery.value = ''
    selectedGenres.value = []
    selectedRuntime.value = null
    sortBy.value = SEARCH_RESULT_SORT_DEFAULT
  }

  const toggleGenre = (genre: string) => {
    const existingIndex = selectedGenres.value.indexOf(genre)

    if (existingIndex >= 0) {
      selectedGenres.value.splice(existingIndex, 1)
      return
    }

    selectedGenres.value.push(genre)
  }

  const fetchMissingMetadata = async () => {
    const missingMovies = myList.value.filter(
      (movie) => !movie.genres?.length && !enrichedMap.value[movie.tmdbId]
    )

    if (missingMovies.length === 0) {
      return
    }

    isLoadingMetadata.value = true
    metadataProgress.value = { loaded: 0, total: missingMovies.length }

    for (let index = 0; index < missingMovies.length; index += METADATA_BATCH_SIZE) {
      const batch = missingMovies.slice(index, index + METADATA_BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((movie) => getMovieDetails(movie.tmdbId)))

      for (let batchIndex = 0; batchIndex < results.length; batchIndex++) {
        const result = results[batchIndex]

        if (result?.status !== 'fulfilled') {
          continue
        }

        const movie = batch[batchIndex]

        if (!movie) {
          continue
        }

        enrichedMap.value[movie.tmdbId] = {
          genres: result.value.genres ?? [],
          runtime: result.value.runtime ?? null,
        }
      }

      metadataProgress.value = {
        loaded: Math.min(index + METADATA_BATCH_SIZE, missingMovies.length),
        total: missingMovies.length,
      }
    }

    isLoadingMetadata.value = false
  }

  return {
    searchQuery,
    selectedGenres,
    selectedRuntime,
    sortBy,
    availableGenres,
    filteredMovies,
    hasActiveFilters,
    isLoadingMetadata,
    metadataProgress,
    clearFilters,
    toggleGenre,
    fetchMissingMetadata,
    RUNTIME_RANGES,
  }
}
