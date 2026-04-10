<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-md bg-gray-200 dark:bg-gray-800">
    <div class="skeleton-shimmer absolute inset-0"></div>
    <div class="absolute bottom-0 left-0 w-full p-4 sm:p-6 flex flex-col gap-3">
      <div class="skeleton-shimmer h-8 w-3/4 rounded-lg"></div>
      <div class="skeleton-shimmer h-4 w-1/2 rounded-lg"></div>
      <div class="skeleton-shimmer h-4 w-1/3 rounded-lg"></div>
      <div class="flex justify-center gap-4 mt-4">
        <div class="skeleton-shimmer w-14 h-14 rounded-full"></div>
        <div class="skeleton-shimmer w-16 h-16 rounded-full"></div>
        <div class="skeleton-shimmer w-14 h-14 rounded-full"></div>
      </div>
    </div>
  </div>
</template>
