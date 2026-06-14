import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useElementSize, useVirtualList, useWindowSize } from '@vueuse/core'

interface ResponsiveSpacing {
  compact: number
  regular: number
}

interface VirtualGridOptions<T> {
  getKey: (item: T) => number
  cardAspectRatio: number
  cardBodyHeight: number
  columnGap: ResponsiveSpacing
  rowGap: ResponsiveSpacing
  overscan?: number
}

interface VirtualGridRow<T> {
  key: string
  items: T[]
}

const TABLET_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1024
const LARGE_DESKTOP_BREAKPOINT = 1280

function getColumnCount(width: number) {
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

function getResponsiveSpacing(width: number, spacing: ResponsiveSpacing) {
  if (width < TABLET_BREAKPOINT) {
    return spacing.compact
  }

  return spacing.regular
}

export function useVirtualGrid<T>(items: Ref<T[]>, options: VirtualGridOptions<T>) {
  const { width } = useWindowSize()
  const gridMeasureRef = ref<HTMLElement | null>(null)
  const { width: gridWidth } = useElementSize(gridMeasureRef)
  const columnCount = computed(() => getColumnCount(width.value))
  const columnGap = computed(() => getResponsiveSpacing(width.value, options.columnGap))
  const rowGap = computed(() => getResponsiveSpacing(width.value, options.rowGap))
  const availableWidth = computed(() => {
    if (gridWidth.value > 0) {
      return gridWidth.value
    }

    return width.value
  })
  const itemWidth = computed(() => {
    const gapWidth = (columnCount.value - 1) * columnGap.value
    return (availableWidth.value - gapWidth) / columnCount.value
  })
  const posterHeight = computed(() => itemWidth.value / options.cardAspectRatio)
  const rowHeight = computed(() => posterHeight.value + options.cardBodyHeight + rowGap.value)
  const rowStyle = computed(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
    columnGap: `${columnGap.value}px`,
    marginBottom: `${rowGap.value}px`,
  }))

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

  const {
    list: virtualRows,
    containerProps,
    wrapperProps,
  } = useVirtualList(rows, {
    itemHeight: () => rowHeight.value,
    overscan: options.overscan ?? 10,
  })

  // The centered content width can change independently from the scroll container.
  // Re-running the range calculation keeps the virtual rows aligned after reflows.
  watch([gridWidth, columnCount, rowHeight], () => {
    containerProps.onScroll()
  })

  return {
    columnCount,
    virtualRows,
    containerProps,
    gridMeasureRef,
    rowHeight,
    rowStyle,
    wrapperProps,
  }
}
