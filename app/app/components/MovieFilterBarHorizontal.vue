<template>
  <section>
    <div class="flex flex-col gap-3">
      <div class="hidden items-center gap-2 max-[449px]:flex">
        <button
          type="button"
          class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition"
          :class="sortBy !== defaultSort ? mobileActionActiveClass : mobileActionInactiveClass"
          @click="isSortModalOpen = true"
        >
          <span>{{ sortLabels[sortBy] }}</span>
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7h18M6 12h12m-9 5h6"
            />
          </svg>
        </button>

        <button
          type="button"
          class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition"
          :class="hasFilterSelections ? mobileActionActiveClass : mobileActionInactiveClass"
          @click="isFilterMenuOpen = true"
        >
          <span>Filters</span>
          <span
            v-if="activeFilterCount > 0"
            class="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]"
          >
            {{ activeFilterCount }}
          </span>
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M7 12h10m-7 6h4"
            />
          </svg>
        </button>
      </div>

      <div
        data-movie-filter-dropdown
        class="flex flex-col gap-2 border border-white/[0.08] bg-[#1c1b1b] p-2.5 max-[449px]:hidden sm:rounded-full sm:p-2.5 lg:flex-row lg:items-center"
        :class="surfaceRadiusClass"
      >
        <label class="relative min-w-0 flex-1">
          <span
            class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8e9192]"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            :value="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="h-12 w-full rounded-full bg-[#2a2a2a] pl-11 pr-10 text-sm text-white outline-none transition focus:ring-1 focus:ring-white/40"
            @input="handleSearchInput"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute inset-y-0 right-3 flex items-center text-[#8e9192] transition hover:text-white"
            @click="$emit('update:searchQuery', '')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </label>

        <div class="hidden h-8 w-px bg-white/[0.08] lg:block"></div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="relative" data-movie-filter-dropdown>
            <button
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition"
              :class="selectedGenres.length > 0 ? activeChipClass : inactiveChipClass"
              @click="toggleDropdown('genre')"
            >
              <span>Genre</span>
              <span
                v-if="selectedGenres.length > 0"
                class="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]"
              >
                {{ selectedGenres.length }}
              </span>
              <svg
                class="h-3.5 w-3.5 transition-transform"
                :class="openDropdown === 'genre' ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              v-if="openDropdown === 'genre'"
              class="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-[1.25rem] border border-[#2a2a2a] bg-[#121212] p-3 shadow-[0_18px_48px_rgb(0_0_0/0.42)]"
            >
              <div class="max-h-64 space-y-1 overflow-y-auto pr-1">
                <button
                  v-for="genre in availableGenres"
                  :key="genre"
                  type="button"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition"
                  :class="selectedGenres.includes(genre) ? selectedRowClass : inactiveRowClass"
                  @click="$emit('toggleGenre', genre)"
                >
                  <span>{{ genre }}</span>
                  <svg
                    v-if="selectedGenres.includes(genre)"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
              <p v-if="availableGenres.length === 0" class="px-2 py-3 text-sm text-[#8e9192]">
                {{ genreEmptyLabel }}
              </p>
            </div>
          </div>

          <div class="relative" data-movie-filter-dropdown>
            <button
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition"
              :class="selectedRuntime ? activeChipClass : inactiveChipClass"
              @click="toggleDropdown('length')"
            >
              <span>{{ selectedRuntime?.label ?? lengthLabel }}</span>
              <svg
                class="h-3.5 w-3.5 transition-transform"
                :class="openDropdown === 'length' ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              v-if="openDropdown === 'length'"
              class="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-56 rounded-[1.25rem] border border-[#2a2a2a] bg-[#121212] p-2 shadow-[0_18px_48px_rgb(0_0_0/0.42)]"
            >
              <button
                type="button"
                class="w-full rounded-xl px-3 py-2 text-left text-sm transition"
                :class="!selectedRuntime ? selectedRowClass : inactiveRowClass"
                @click="selectRuntime(null)"
              >
                Any length
              </button>
              <button
                v-for="range in runtimeRanges"
                :key="range.label"
                type="button"
                class="w-full rounded-xl px-3 py-2 text-left text-sm transition"
                :class="
                  selectedRuntime?.label === range.label ? selectedRowClass : inactiveRowClass
                "
                @click="selectRuntime(range)"
              >
                {{ range.label }}
              </button>
            </div>
          </div>

          <div class="relative" data-movie-filter-dropdown>
            <button
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-medium transition"
              :class="sortBy !== defaultSort ? activeChipClass : inactiveChipClass"
              @click="toggleDropdown('sort')"
            >
              <span>{{ sortLabelPrefix }} {{ sortLabels[sortBy] }}</span>
              <svg
                class="h-3.5 w-3.5 transition-transform"
                :class="openDropdown === 'sort' ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div
              v-if="openDropdown === 'sort'"
              class="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-56 rounded-[1.25rem] border border-[#2a2a2a] bg-[#121212] p-2 shadow-[0_18px_48px_rgb(0_0_0/0.42)]"
            >
              <button
                v-for="option in sortOptions"
                :key="option.value"
                type="button"
                class="w-full rounded-xl px-3 py-2 text-left text-sm transition"
                :class="sortBy === option.value ? selectedRowClass : inactiveRowClass"
                @click="selectSortOption(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasVisibleActiveFilters" class="flex items-center gap-2 overflow-x-auto px-1 pb-1">
        <button
          v-if="searchQuery.trim()"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#141313] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white transition hover:border-white/30"
          @click="$emit('update:searchQuery', '')"
        >
          <span>Search: {{ searchQuery.trim() }}</span>
          <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <button
          v-for="genre in selectedGenres"
          :key="genre"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#18181b] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white transition hover:border-white/30"
          @click="$emit('toggleGenre', genre)"
        >
          <span>{{ genre }}</span>
          <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <button
          v-if="selectedRuntime"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#141313] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white transition hover:border-white/30"
          @click="selectRuntime(null)"
        >
          <span>{{ selectedRuntime.label }}</span>
          <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <button
          type="button"
          class="inline-flex shrink-0 items-center self-center px-1 text-[0.62rem] uppercase tracking-[0.16em] text-[#8e9192] transition hover:text-white"
          @click="$emit('clearFilters')"
        >
          Clear all
        </button>
      </div>

      <div v-if="isLoadingMetadata" class="space-y-2 px-1">
        <div class="flex items-center gap-2 text-xs text-[#8e9192]">
          <span
            class="h-3.5 w-3.5 animate-spin rounded-full border border-white/20 border-t-white"
          ></span>
          <span>
            Loading movie metadata for filters... {{ metadataProgress.loaded }}/{{
              metadataProgress.total
            }}
          </span>
        </div>
        <div class="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            class="h-full rounded-full bg-white transition-[width] duration-300"
            :style="{ width: metadataWidth }"
          />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isFilterMenuOpen"
          class="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
          @click.self="isFilterMenuOpen = false"
        >
          <div class="flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden bg-transparent">
            <div class="overflow-y-auto">
              <MovieFilterBarSideMenu
                :search-query="searchQuery"
                :selected-genres="selectedGenres"
                :selected-runtime="selectedRuntime"
                :sort-by="sortBy"
                :available-genres="availableGenres"
                :runtime-ranges="runtimeRanges"
                :search-placeholder="searchPlaceholder"
                @update:search-query="$emit('update:searchQuery', $event)"
                @update:selected-runtime="$emit('update:selectedRuntime', $event)"
                @update:sort-by="$emit('update:sortBy', $event)"
                @toggle-genre="$emit('toggleGenre', $event)"
                @clear-filters="$emit('clearFilters')"
                @close="isFilterMenuOpen = false"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isSortModalOpen"
          class="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-4"
          @click.self="isSortModalOpen = false"
        >
          <div class="flex max-h-[95dvh] w-full max-w-sm flex-col overflow-hidden bg-transparent">
            <div class="flex items-center justify-between px-5 pb-2 pt-4">
              <p class="text-sm text-[#8e9192]">{{ sortModalTitle }}</p>
              <button
                class="rounded-full p-1 text-[#8e9192] transition hover:text-white"
                @click="isSortModalOpen = false"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div
              class="space-y-2 rounded-[1.75rem] border border-white/[0.08] bg-[#141313] px-4 pb-4 pt-4"
            >
              <button
                v-for="option in sortOptions"
                :key="`mobile-${option.value}`"
                type="button"
                class="w-full rounded-xl border px-4 py-3 text-left text-sm transition"
                :class="sortBy === option.value ? mobileSortActiveClass : mobileSortInactiveClass"
                @click="selectMobileSortOption(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import type { RuntimeRange, SortOption } from '~/composables/useWatchedFilters'
import { MY_LIST_SORT_LABELS } from '~/composables/useMyListFilters'

const DEFAULT_SORT: SortOption = 'default'
const SEARCH_PLACEHOLDER = 'Search your watchlist...'
const LENGTH_LABEL = 'Length'
const SORT_LABEL_PREFIX = 'Sort:'
const SORT_MODAL_TITLE = 'Sort watchlist'
const EMPTY_GENRE_LABEL = 'No genres available yet'
const SURFACE_RADIUS_CLASS = 'rounded-[1.5rem]'
const ACTIVE_CHIP_CLASS =
  'border-white/30 bg-[#18181b] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
const INACTIVE_CHIP_CLASS =
  'border-white/[0.08] bg-[#141313] text-[#c4c7c8] hover:border-white/30 hover:text-white'
const SELECTED_ROW_CLASS = 'bg-[#2a2a2a] text-white border-white/20'
const INACTIVE_ROW_CLASS = 'text-[#c4c7c8] hover:bg-white/[0.06] hover:text-white'
const MOBILE_ACTION_ACTIVE_CLASS =
  'border-white/30 bg-[#262525] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]'
const MOBILE_ACTION_INACTIVE_CLASS =
  'border-white/[0.08] bg-[#1f1e1e] text-[#c4c7c8] shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:border-white/30 hover:bg-[#282727] hover:text-white'
const MOBILE_SORT_ACTIVE_CLASS =
  'border-white/20 bg-[#292727] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]'
const MOBILE_SORT_INACTIVE_CLASS =
  'border-white/[0.08] bg-[#202020] text-[#c4c7c8] shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:border-white/30 hover:bg-[#292828] hover:text-white'
const MOBILE_BREAKPOINT_QUERY = '(max-width: 449px)'

type DropdownName = 'genre' | 'length' | 'sort'

const props = withDefaults(
  defineProps<{
    searchQuery: string
    selectedGenres: string[]
    selectedRuntime: RuntimeRange | null
    sortBy: SortOption
    availableGenres: string[]
    runtimeRanges: RuntimeRange[]
    hasActiveFilters: boolean
    filteredCount: number
    totalCount: number
    isLoadingMetadata: boolean
    metadataProgress: {
      loaded: number
      total: number
    }
    searchPlaceholder?: string
    sortLabels?: Record<SortOption, string>
    sortLabelPrefix?: string
    sortModalTitle?: string
  }>(),
  {
    searchPlaceholder: SEARCH_PLACEHOLDER,
    sortLabels: () => MY_LIST_SORT_LABELS,
    sortLabelPrefix: SORT_LABEL_PREFIX,
    sortModalTitle: SORT_MODAL_TITLE,
  }
)

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:selectedRuntime': [value: RuntimeRange | null]
  'update:sortBy': [value: SortOption]
  toggleGenre: [genre: string]
  clearFilters: []
}>()

const openDropdown = ref<DropdownName | null>(null)
const isFilterMenuOpen = ref(false)
const isSortModalOpen = ref(false)
let mobileMediaQuery: MediaQueryList | null = null
const defaultSort = DEFAULT_SORT
const lengthLabel = LENGTH_LABEL
const genreEmptyLabel = EMPTY_GENRE_LABEL
const surfaceRadiusClass = SURFACE_RADIUS_CLASS
const activeChipClass = ACTIVE_CHIP_CLASS
const inactiveChipClass = INACTIVE_CHIP_CLASS
const selectedRowClass = SELECTED_ROW_CLASS
const inactiveRowClass = INACTIVE_ROW_CLASS
const mobileActionActiveClass = MOBILE_ACTION_ACTIVE_CLASS
const mobileActionInactiveClass = MOBILE_ACTION_INACTIVE_CLASS
const mobileSortActiveClass = MOBILE_SORT_ACTIVE_CLASS
const mobileSortInactiveClass = MOBILE_SORT_INACTIVE_CLASS

const sortOptions = computed(() => {
  return (Object.keys(props.sortLabels) as SortOption[]).map((value) => ({
    value,
    label: props.sortLabels[value],
  }))
})

const metadataWidth = computed(() => {
  if (props.metadataProgress.total === 0) {
    return '0%'
  }

  return `${(props.metadataProgress.loaded / props.metadataProgress.total) * 100}%`
})

const hasVisibleActiveFilters = computed(() => {
  return (
    props.searchQuery.trim() !== '' ||
    props.selectedGenres.length > 0 ||
    props.selectedRuntime !== null
  )
})

const hasFilterSelections = computed(() => {
  return (
    props.searchQuery.trim() !== '' ||
    props.selectedGenres.length > 0 ||
    props.selectedRuntime !== null
  )
})

const activeFilterCount = computed(() => {
  let count = 0

  if (props.searchQuery.trim() !== '') {
    count++
  }

  count += props.selectedGenres.length

  if (props.selectedRuntime !== null) {
    count++
  }

  return count
})

const toggleDropdown = (name: DropdownName) => {
  openDropdown.value = openDropdown.value === name ? null : name
}

const handleSearchInput = (event: Event) => {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  emit('update:searchQuery', input.value)
}

const selectRuntime = (runtime: RuntimeRange | null) => {
  emit('update:selectedRuntime', runtime)
  openDropdown.value = null
}

const selectSortOption = (sortOption: SortOption) => {
  emit('update:sortBy', sortOption)
  openDropdown.value = null
}

const selectMobileSortOption = (sortOption: SortOption) => {
  emit('update:sortBy', sortOption)
  isSortModalOpen.value = false
}

const closeDropdowns = (event: MouseEvent) => {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return
  }

  if (target.closest('[data-movie-filter-dropdown]')) {
    return
  }

  openDropdown.value = null
}

const closeDesktopOverlays = (event: MediaQueryListEvent) => {
  if (event.matches) {
    openDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdowns)
  mobileMediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY)
  mobileMediaQuery.addEventListener('change', closeDesktopOverlays)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)

  if (!mobileMediaQuery) {
    return
  }

  mobileMediaQuery.removeEventListener('change', closeDesktopOverlays)
  mobileMediaQuery = null
})
</script>
