import { computed } from 'vue'
import type { Ref } from 'vue'
import { useVirtualList, useWindowSize } from '@vueuse/core'

interface VirtualGridOptions<T> {
  getKey: (item: T) => number
  rowHeight: number
  overscan?: number
}

interface VirtualGridRow<T> {
  key: string
  items: T[]
}

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1024
const LARGE_DESKTOP_BREAKPOINT = 1280

function getColumnCount(width: number) {
  if (width < MOBILE_BREAKPOINT) {
    return 1
  }

  if (width < TABLET_BREAKPOINT) {
    return 2
  }

  if (width < DESKTOP_BREAKPOINT) {
    return 3
  }

  if (width < LARGE_DESKTOP_BREAKPOINT) {
    return 4
  }

  return 5
}

export function useVirtualGrid<T>(items: Ref<T[]>, options: VirtualGridOptions<T>) {
  const { width } = useWindowSize()
  const columnCount = computed(() => getColumnCount(width.value))

  const rows = computed<VirtualGridRow<T>[]>(() => {
    const nextRows: VirtualGridRow<T>[] = []

    for (let index = 0; index < items.value.length; index += columnCount.value) {
      const rowItems = items.value.slice(index, index + columnCount.value)
      const firstItem = rowItems[0]
      const lastItem = rowItems[rowItems.length - 1]

      if (!firstItem || !lastItem) {
        continue
      }

      nextRows.push({
        key: `${options.getKey(firstItem)}-${options.getKey(lastItem)}`,
        items: rowItems,
      })
    }

    return nextRows
  })

  const { list: virtualRows, containerProps, wrapperProps } = useVirtualList(rows, {
    itemHeight: options.rowHeight,
    overscan: options.overscan ?? 5,
  })

  return {
    columnCount,
    virtualRows,
    containerProps,
    wrapperProps,
  }
}
