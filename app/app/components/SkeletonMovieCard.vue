<template>
  <div class="skeleton-card flex h-full min-h-0 w-full flex-col">
    <div class="skeleton-poster-stack relative">
      <div class="skeleton-poster-back skeleton-poster-back-left"></div>
      <div class="skeleton-poster-back skeleton-poster-back-right"></div>

      <div class="skeleton-poster relative overflow-hidden border border-zinc-800 bg-zinc-900 shadow-glow">
        <div class="skeleton-shimmer absolute inset-0"></div>
        <div class="skeleton-status-cluster absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <div class="skeleton-status skeleton-shimmer rounded-full"></div>
          <div class="skeleton-status skeleton-shimmer rounded-full"></div>
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
        <div
          class="skeleton-rating absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md"
        >
          <div class="skeleton-rating-star skeleton-shimmer rounded-full"></div>
          <div class="skeleton-rating-text skeleton-shimmer rounded"></div>
        </div>
      </div>
    </div>

    <div class="skeleton-copy space-y-2">
      <div class="skeleton-heading flex items-center justify-between gap-3">
        <div class="skeleton-shimmer h-10 w-2/3 rounded"></div>
        <div class="skeleton-shimmer h-4 w-12 rounded"></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-16 rounded-full"></div>
      </div>
    </div>

    <div class="skeleton-actions flex shrink-0 justify-center gap-4">
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

.skeleton-poster-stack {
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 1 / 1.5;
}

.skeleton-poster-back {
  position: absolute;
  inset: 0;
  border-radius: 1.125rem;
  background: rgb(24 24 27);
  border: 1px solid rgb(82 82 91 / 0.9);
  box-shadow:
    0 10px 26px rgb(0 0 0 / 0.2),
    0 0 0 1px rgb(255 255 255 / 0.03);
  pointer-events: none;
}

.skeleton-poster-back-left {
  opacity: 0.3;
  transform: translateX(-0.55rem) rotate(-1.6deg);
}

.skeleton-poster-back-right {
  opacity: 0.42;
  transform: translateX(0.55rem) rotate(1.4deg);
}

.skeleton-copy {
  width: 100%;
}

.skeleton-heading {
  margin-bottom: clamp(0.12rem, 1.5cqw, 0.4rem);
  padding-bottom: clamp(0.08rem, 0.8cqw, 0.18rem);
}

.skeleton-copy > :not([hidden]) ~ :not([hidden]) {
  margin-top: clamp(0.1rem, 1.8cqw, 0.5rem);
}

.skeleton-actions {
  gap: clamp(0.25rem, 3.5cqw, 1rem);
}

.skeleton-status {
  width: clamp(1.2rem, 8.7cqw, 2rem);
  height: clamp(1.2rem, 8.7cqw, 2rem);
}

.skeleton-rating {
  min-width: clamp(3.5rem, 19cqw, 4.8rem);
}

.skeleton-rating-star {
  width: clamp(0.72rem, 3.9cqw, 0.92rem);
  height: clamp(0.72rem, 3.9cqw, 0.92rem);
}

.skeleton-rating-text {
  width: clamp(1.7rem, 9.6cqw, 2.4rem);
  height: clamp(0.68rem, 3.8cqw, 0.9rem);
}

.skeleton-action {
  width: clamp(2.1rem, 16.1cqw, 3.7rem);
  height: clamp(2.1rem, 16.1cqw, 3.7rem);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.04),
    0 8px 18px rgb(0 0 0 / 0.18),
    0 0 18px rgb(255 255 255 / 0.05);
}

.skeleton-action-primary {
  width: clamp(2.7rem, 20.4cqw, 4.7rem);
  height: clamp(2.7rem, 20.4cqw, 4.7rem);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.08),
    0 10px 24px rgb(0 0 0 / 0.22),
    0 0 22px rgb(255 255 255 / 0.08);
}
</style>
