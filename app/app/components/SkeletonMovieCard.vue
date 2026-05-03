<template>
  <div class="skeleton-card flex h-full min-h-0 w-full flex-col">
    <div class="skeleton-poster relative overflow-hidden border border-zinc-800 bg-zinc-900 shadow-glow">
      <div class="skeleton-shimmer absolute inset-0"></div>
    </div>

    <div class="skeleton-copy space-y-3">
      <div class="skeleton-shimmer h-10 w-2/3 rounded"></div>
      <div class="skeleton-shimmer h-4 w-1/2 rounded"></div>
      <div class="flex gap-2">
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-16 rounded-full"></div>
      </div>
    </div>

    <div class="flex shrink-0 justify-center gap-4">
      <div class="skeleton-action skeleton-shimmer rounded-full"></div>
      <div class="skeleton-action-primary skeleton-shimmer rounded-full"></div>
      <div class="skeleton-action skeleton-shimmer rounded-full"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  container-type: inline-size;
  gap: clamp(0.25rem, 3.5cqw, 1rem);
  justify-content: center;
}

.skeleton-poster {
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 1 / 1.5;
  border-radius: 1.125rem;
}

.skeleton-copy {
  width: 100%;
}

.skeleton-copy > :not([hidden]) ~ :not([hidden]) {
  margin-top: clamp(0.1rem, 1.8cqw, 0.5rem);
}

.skeleton-action {
  width: clamp(2.1rem, 16.1cqw, 3.7rem);
  height: clamp(2.1rem, 16.1cqw, 3.7rem);
}

.skeleton-action-primary {
  width: clamp(2.7rem, 20.4cqw, 4.7rem);
  height: clamp(2.7rem, 20.4cqw, 4.7rem);
}
</style>
