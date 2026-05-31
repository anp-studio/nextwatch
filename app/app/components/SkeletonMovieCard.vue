<template>
  <div :class="rootClasses">
    <div :class="cardWrapperClasses">
      <div
        class="[container-type:inline-size] flex min-h-0 max-h-full w-full flex-1 flex-col justify-center gap-[clamp(0.25rem,3.5cqw,1rem)] px-[clamp(0.35rem,1vw,0.85rem)] py-[clamp(0.15rem,0.5vw,0.4rem)] sm:px-[0.35rem] lg:px-0 lg:py-0 max-[760px]:py-[0.1rem] max-[680px]:px-[0.75rem] max-[680px]:py-0"
      >
        <div class="relative w-full shrink-0 aspect-[1/1.5]">
          <div
            class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-outline opacity-30 [transform:translateX(-0.55rem)_rotate(-1.6deg)]"
            style="background-color: rgb(var(--color-surface-container-low)); box-shadow: 0 10px 26px rgb(0 0 0 / 0.2), 0 0 0 1px rgb(255 255 255 / 0.03);"
          ></div>
          <div
            class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-outline opacity-40 [transform:translateX(0.55rem)_rotate(1.4deg)]"
            style="background-color: rgb(var(--color-surface-container-low)); box-shadow: 0 10px 26px rgb(0 0 0 / 0.2), 0 0 0 1px rgb(255 255 255 / 0.03);"
          ></div>

          <div
            class="relative w-full shrink-0 aspect-[1/1.5] overflow-hidden rounded-[1.125rem] border border-outline-variant bg-surface-container-low shadow-glow"
          >
            <div class="skeleton-shimmer absolute inset-0"></div>
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            ></div>
            <div
              class="absolute bottom-3 right-3 z-10 inline-flex min-w-[clamp(3.5rem,19cqw,4.8rem)] items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md"
            >
              <div
                class="skeleton-shimmer h-[clamp(0.72rem,3.9cqw,0.92rem)] w-[clamp(0.72rem,3.9cqw,0.92rem)] rounded-full"
              ></div>
              <div
                class="skeleton-shimmer h-[clamp(0.68rem,3.8cqw,0.9rem)] w-[clamp(1.7rem,9.6cqw,2.4rem)] rounded"
              ></div>
            </div>
          </div>
        </div>

        <div class="w-full space-y-2">
          <div
            class="mb-[clamp(0.12rem,1.5cqw,0.4rem)] flex items-center justify-between gap-3 pb-[clamp(0.08rem,0.8cqw,0.18rem)]"
          >
            <div class="skeleton-shimmer h-[clamp(1.2rem,9.4cqw,2.15rem)] flex-1 rounded"></div>
            <div
              class="skeleton-shimmer h-[clamp(0.75rem,4.2cqw,0.98rem)] w-12 shrink-0 rounded"
            ></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <div class="skeleton-shimmer h-[clamp(1rem,5.6cqw,1.38rem)] w-20 rounded-full"></div>
            <div class="skeleton-shimmer h-[clamp(1rem,5.6cqw,1.38rem)] w-20 rounded-full"></div>
            <div class="skeleton-shimmer h-[clamp(1rem,5.6cqw,1.38rem)] w-16 rounded-full"></div>
          </div>
        </div>

        <div
          class="flex shrink-0 items-center justify-center gap-[clamp(0.25rem,3.5cqw,1rem)] pt-[clamp(0rem,0.35cqw,0.1rem)]"
        >
          <div
            class="skeleton-shimmer h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] rounded-full [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
          ></div>
          <div
            class="skeleton-shimmer h-[clamp(2.7rem,20.4cqw,4.7rem)] w-[clamp(2.7rem,20.4cqw,4.7rem)] rounded-full [box-shadow:0_0_0_1px_rgb(255_255_255/0.08),0_10px_24px_rgb(0_0_0/0.22),0_0_22px_rgb(255_255_255/0.08)]"
          ></div>
          <div
            class="skeleton-shimmer h-[clamp(2.1rem,16.1cqw,3.7rem)] w-[clamp(2.1rem,16.1cqw,3.7rem)] rounded-full [box-shadow:0_0_0_1px_rgb(255_255_255/0.04),0_8px_18px_rgb(0_0_0/0.18),0_0_18px_rgb(255_255_255/0.05)]"
          ></div>
        </div>
      </div>
    </div>

    <div
      v-if="showDesktopDetails"
      class="hidden min-h-0 lg:flex lg:max-w-[48rem] lg:flex-col lg:py-[clamp(0.15rem,0.5vw,0.4rem)]"
    >
      <div
        class="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-outline-variant bg-surface-container-low shadow-glow"
      >
        <div class="relative w-full flex-shrink-0 bg-surface-container-high pt-[48%] xl:pt-[44%]">
          <div class="skeleton-shimmer absolute inset-0"></div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div class="space-y-3">
            <div class="skeleton-shimmer h-9 w-3/4 rounded"></div>
            <div class="flex flex-wrap gap-3">
              <div class="skeleton-shimmer h-5 w-12 rounded-full"></div>
              <div class="skeleton-shimmer h-5 w-16 rounded-full"></div>
              <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
            <div class="skeleton-shimmer h-7 w-24 rounded-full"></div>
            <div class="skeleton-shimmer h-7 w-16 rounded-full"></div>
          </div>

          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-20 rounded"></div>
            <div class="skeleton-shimmer h-4 w-3/5 rounded"></div>
          </div>

          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-14 rounded"></div>
            <div class="skeleton-shimmer h-4 w-4/5 rounded"></div>
          </div>

          <div class="space-y-2">
            <div class="skeleton-shimmer h-4 w-full rounded"></div>
            <div class="skeleton-shimmer h-4 w-full rounded"></div>
            <div class="skeleton-shimmer h-4 w-5/6 rounded"></div>
            <div class="skeleton-shimmer h-4 w-2/3 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'card' | 'desktop'
}>()

const showDesktopDetails = computed(() => props.variant === 'desktop')
const rootClasses = computed(() =>
  showDesktopDetails.value
    ? 'flex h-full min-h-0 w-full flex-col justify-center gap-6 lg:grid lg:grid-cols-[min(24.5rem,max(16rem,var(--height-fit-width)))_minmax(0,1fr)] lg:items-stretch lg:gap-16 lg:pl-10 xl:grid-cols-[min(25.5rem,max(16rem,var(--height-fit-width)))_minmax(0,1fr)] xl:gap-20 xl:pl-14'
    : 'flex h-full min-h-0 w-full flex-col justify-center'
)
const cardWrapperClasses = computed(() =>
  showDesktopDetails.value
    ? 'mx-auto flex h-full min-h-0 w-[min(100%,29rem,max(16rem,var(--height-fit-width)))] max-h-full flex-col justify-center lg:mx-0 lg:w-full lg:max-w-none xl:max-w-none'
    : 'mx-auto flex h-full min-h-0 w-full max-w-[min(100%,29rem,max(16rem,var(--height-fit-width)))] flex-col justify-center'
)
</script>
