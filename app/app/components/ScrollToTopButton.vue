<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <button
      v-if="isVisible"
      type="button"
      class="fixed right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-on-surface shadow-glow transition-colors hover:border-primary/40 hover:text-on-background sm:right-8"
      :style="{ bottom: `${bottomOffset}px` }"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, unref, watch } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { createScrollToTopOptions, shouldShowScrollToTop } from '~/utils/scroll-to-top'

type ScrollTarget = HTMLElement | null | Ref<HTMLElement | null>

const FOOTER_SELECTOR = '[data-bottom-nav]'
const FOOTER_OFFSET = 12
const PAGE_EDGE_OFFSET = 12

const props = defineProps<{
  target: ScrollTarget
}>()

const isVisible = ref(false)
const bottomOffset = ref(PAGE_EDGE_OFFSET)
const targetElement = computed(() => unref(props.target))

function syncVisibility() {
  isVisible.value = shouldShowScrollToTop(targetElement.value?.scrollTop ?? 0)
}

function syncBottomOffset() {
  const footer = document.querySelector<HTMLElement>(FOOTER_SELECTOR)

  if (!footer) {
    bottomOffset.value = PAGE_EDGE_OFFSET
    return
  }

  bottomOffset.value = footer.getBoundingClientRect().height + FOOTER_OFFSET
}

function scrollToTop() {
  targetElement.value?.scrollTo(createScrollToTopOptions())
}

useEventListener(targetElement, 'scroll', syncVisibility, { passive: true })
useEventListener(window, 'resize', syncBottomOffset, { passive: true })

watch(
  targetElement,
  () => {
    syncVisibility()
  },
  { immediate: true }
)

onMounted(() => {
  syncBottomOffset()
})
</script>
