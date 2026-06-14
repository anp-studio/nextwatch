export const SCROLL_VISIBILITY_THRESHOLD = 320
export const SMOOTH_SCROLL_BEHAVIOR = 'smooth'
export const TOP_SCROLL_POSITION = 0

export function shouldShowScrollToTop(scrollTop: number) {
  return scrollTop > SCROLL_VISIBILITY_THRESHOLD
}

export function createScrollToTopOptions() {
  return {
    top: TOP_SCROLL_POSITION,
    behavior: SMOOTH_SCROLL_BEHAVIOR,
  } as const
}
