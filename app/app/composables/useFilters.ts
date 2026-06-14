import { computed, ref } from 'vue'
import type { Ref } from 'vue'

export type SortOption = 'default' | 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc'

export interface RuntimeRange {
  label: string
  min: number
  max: number
}

interface FilterableMovie {
  title: string
  year: number
  genres?: string[]
  runtime?: number | null
  rating?: number | null
}

interface UseFiltersOptions {
  searchQuery?: Ref<string>
  enableRating?: boolean
  enableRuntime?: boolean
  includeSearchInActiveState?: boolean
  clearSearchOnReset?: boolean
}

const DEFAULT_SORT: SortOption = 'default'

export const RUNTIME_RANGES: RuntimeRange[] = [
  { label: 'Under 90 min', min: 0, max: 89 },
  { label: '90-120 min', min: 90, max: 120 },
  { label: '120-150 min', min: 120, max: 150 },
  { label: 'Over 150 min', min: 151, max: Infinity },
]

export const WATCHED_SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  'title-asc': 'Title A-Z',
  'title-desc': 'Title Z-A',
  'year-desc': 'Newest first',
  'year-asc': 'Oldest first',
}

export const MY_LIST_SORT_LABELS = WATCHED_SORT_LABELS
export const SEARCH_SORT_LABELS = WATCHED_SORT_LABELS

export function useFilters<T extends FilterableMovie>(
  movies: Ref<T[]>,
  options: UseFiltersOptions = {}
) {
  const {
    searchQuery = ref(''),
    enableRating = false,
    enableRuntime = true,
    includeSearchInActiveState = true,
    clearSearchOnReset = true,
  } = options

  const selectedGenres = ref<string[]>([])
  const selectedRuntime = ref<RuntimeRange | null>(null)
  const sortBy = ref<SortOption>(DEFAULT_SORT)
  const minRating = ref<number | null>(null)

  const availableGenres = computed(() => {
    const genreSet = new Set<string>()

    for (const movie of movies.value) {
      for (const genre of movie.genres ?? []) {
        genreSet.add(genre)
      }
    }

    return [...genreSet].sort()
  })

  const filteredMovies = computed(() => {
    let result = [...movies.value]
    const normalizedQuery = searchQuery.value.trim().toLowerCase()

    if (normalizedQuery.length > 0) {
      result = result.filter((movie) => movie.title.toLowerCase().includes(normalizedQuery))
    }

    if (selectedGenres.value.length > 0) {
      result = result.filter((movie) =>
        selectedGenres.value.every((genre) => (movie.genres ?? []).includes(genre))
      )
    }

    if (enableRuntime && selectedRuntime.value) {
      const { min, max } = selectedRuntime.value
      result = result.filter((movie) => {
        if (typeof movie.runtime !== 'number') {
          return false
        }

        return movie.runtime >= min && movie.runtime <= max
      })
    }

    if (enableRating && minRating.value !== null) {
      const ratingThreshold = minRating.value

      result = result.filter((movie) => {
        if (typeof movie.rating !== 'number') {
          return false
        }

        return movie.rating >= ratingThreshold
      })
    }

    if (sortBy.value !== DEFAULT_SORT) {
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
    const hasSearch = includeSearchInActiveState && searchQuery.value.trim().length > 0

    return (
      hasSearch ||
      selectedGenres.value.length > 0 ||
      (enableRuntime && selectedRuntime.value !== null) ||
      sortBy.value !== DEFAULT_SORT ||
      (enableRating && minRating.value !== null)
    )
  })

  const clearFilters = () => {
    if (clearSearchOnReset) {
      searchQuery.value = ''
    }

    selectedGenres.value = []
    selectedRuntime.value = null
    sortBy.value = DEFAULT_SORT
    minRating.value = null
  }

  const toggleGenre = (genre: string) => {
    const existingIndex = selectedGenres.value.indexOf(genre)

    if (existingIndex >= 0) {
      selectedGenres.value.splice(existingIndex, 1)
      return
    }

    selectedGenres.value.push(genre)
  }

  return {
    searchQuery,
    selectedGenres,
    selectedRuntime,
    sortBy,
    minRating,
    availableGenres,
    filteredMovies,
    hasActiveFilters,
    clearFilters,
    toggleGenre,
    runtimeRanges: enableRuntime ? RUNTIME_RANGES : [],
  }
}
