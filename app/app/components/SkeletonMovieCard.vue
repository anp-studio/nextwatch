<template>
  <div
    class="[container-type:inline-size] flex h-full min-h-0 w-full flex-col justify-center gap-[clamp(0.25rem,3.5cqw,1rem)]"
  >
    <div class="relative w-full shrink-0 aspect-[1/1.5]">
      <div
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-[rgb(82_82_91/0.9)] bg-zinc-900 opacity-30 [box-shadow:0_10px_26px_rgb(0_0_0/0.2),0_0_0_1px_rgb(255_255_255/0.03)] [transform:translateX(-0.55rem)_rotate(-1.6deg)]"
      ></div>
      <div
        class="pointer-events-none absolute inset-0 rounded-[1.125rem] border border-[rgb(82_82_91/0.9)] bg-zinc-900 opacity-40 [box-shadow:0_10px_26px_rgb(0_0_0/0.2),0_0_0_1px_rgb(255_255_255/0.03)] [transform:translateX(0.55rem)_rotate(1.4deg)]"
      ></div>

      <div
        class="relative w-full shrink-0 aspect-[1/1.5] overflow-hidden rounded-[1.125rem] border border-zinc-800 bg-zinc-900 shadow-glow"
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

    <div class="w-full space-y-[clamp(0.1rem,1.8cqw,0.5rem)]">
      <div
        class="mb-[clamp(0.08rem,1.1cqw,0.28rem)] flex items-center justify-between gap-3 pb-[clamp(0.04rem,0.45cqw,0.1rem)]"
      >
        <div class="skeleton-shimmer h-[clamp(1.9rem,11.2cqw,3.7rem)] flex-1 rounded"></div>
        <div class="skeleton-shimmer h-[clamp(0.75rem,4.2cqw,0.98rem)] w-12 shrink-0 rounded"></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-20 rounded-full"></div>
        <div class="skeleton-shimmer h-7 w-16 rounded-full"></div>
      </div>
    </div>

    <div
      class="flex shrink-0 justify-center gap-[clamp(0.25rem,3.5cqw,1rem)] pt-[clamp(0rem,0.35cqw,0.1rem)]"
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
</template>
