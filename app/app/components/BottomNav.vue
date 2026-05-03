<template>
  <nav class="z-50 border-t border-zinc-800 bg-black">
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-around gap-2 px-3 sm:h-[4.25rem] sm:px-6 lg:px-8">
      <NuxtLink
        to="/"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-zinc-200 sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        exact-active-class="!text-white nav-link-active"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M8.5 11.25l2.25 2.25 4.75-4.75"
          />
        </svg>
        <span>Discover</span>
      </NuxtLink>

      <NuxtLink
        to="/mylist"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-zinc-200 sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-white nav-link-active"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 5.75A1.75 1.75 0 017.75 4h8.5A1.75 1.75 0 0118 5.75V20l-6-3-6 3V5.75z"
          />
        </svg>
        <span>Watchlist</span>
      </NuxtLink>

      <NuxtLink
        to="/watched"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-zinc-200 sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-white nav-link-active"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12z"
          />
          <circle cx="12" cy="12" r="2.5" stroke-width="1.75" />
        </svg>
        <span>Watched</span>
      </NuxtLink>

      <NuxtLink
        to="/search"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-zinc-500 transition-colors hover:text-zinc-200 sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-white nav-link-active"
      >
        <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M20 20l-3.5-3.5"
          />
        </svg>
        <span>Search</span>
      </NuxtLink>
    </div>
  </nav>
</template>
