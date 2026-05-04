<template>
  <aside
    class="w-full rounded-[1.75rem] border border-[#2a2a2a] bg-[linear-gradient(180deg,#141313_0%,#0e0e0e_100%)] p-5 shadow-[0_24px_64px_rgb(0_0_0/0.45)]"
  >
    <div class="space-y-5">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <h2 class="text-sm font-semibold uppercase tracking-[0.28em] text-white">Filters</h2>
        <button
          type="button"
          class="rounded-full p-1 text-[#8e9192] transition hover:text-white"
          @click="$emit('close')"
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

      <label class="relative block">
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
          placeholder="Search titles..."
          class="h-11 w-full rounded-xl border border-white/[0.08] bg-[#1c1b1b] pl-11 pr-4 text-sm text-white outline-none transition focus:border-white/40"
          @input="handleSearchInput"
        />
      </label>

      <section class="space-y-3">
        <h3 class="text-[0.7rem] uppercase tracking-[0.22em] text-[#8e9192]">Genre</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="genre in availableGenres"
            :key="genre"
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition"
            :class="selectedGenres.includes(genre) ? activeChipClass : inactiveChipClass"
            @click="$emit('toggleGenre', genre)"
          >
            {{ genre }}
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h3 class="text-[0.7rem] uppercase tracking-[0.22em] text-[#8e9192]">Length</h3>
        <div class="space-y-2">
          <button
            v-for="range in runtimeRanges"
            :key="range.label"
            type="button"
            class="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition"
            :class="selectedRuntime?.label === range.label ? activeRowClass : inactiveRowClass"
            @click="
              $emit('update:selectedRuntime', selectedRuntime?.label === range.label ? null : range)
            "
          >
            <span>{{ range.label }}</span>
            <span
              class="h-4 w-4 rounded-sm border"
              :class="
                selectedRuntime?.label === range.label
                  ? 'border-white bg-white'
                  : 'border-[#444748]'
              "
            ></span>
          </button>
        </div>
      </section>

      <div class="pt-2">
        <button
          type="button"
          class="w-full rounded-xl border border-[#353434] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c4c7c8] transition hover:border-white/30 hover:text-white"
          @click="$emit('clearFilters')"
        >
          Reset
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { RuntimeRange, SortOption } from '~/composables/useWatchedFilters'

const ACTIVE_CHIP_CLASS = 'border-white bg-white text-black'
const INACTIVE_CHIP_CLASS = 'border-[#444748] text-[#c4c7c8] hover:border-white/30 hover:text-white'
const ACTIVE_ROW_CLASS = 'border-white/25 bg-[#18181b] text-white'
const INACTIVE_ROW_CLASS =
  'border-[#353434] bg-transparent text-[#c4c7c8] hover:border-white/30 hover:text-white'

defineProps<{
  searchQuery: string
  selectedGenres: string[]
  selectedRuntime: RuntimeRange | null
  sortBy: SortOption
  availableGenres: string[]
  runtimeRanges: RuntimeRange[]
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:selectedRuntime': [value: RuntimeRange | null]
  'update:sortBy': [value: SortOption]
  toggleGenre: [genre: string]
  clearFilters: []
  close: []
}>()

const activeChipClass = ACTIVE_CHIP_CLASS
const inactiveChipClass = INACTIVE_CHIP_CLASS
const activeRowClass = ACTIVE_ROW_CLASS
const inactiveRowClass = INACTIVE_ROW_CLASS

const handleSearchInput = (event: Event) => {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  emit('update:searchQuery', input.value)
}
</script>
