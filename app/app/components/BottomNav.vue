<template>
  <nav class="z-50 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
    <div
      class="mx-auto flex h-16 w-full max-w-7xl items-center justify-around gap-2 px-3 sm:h-[4.25rem] sm:px-6 lg:px-8"
    >
      <NuxtLink
        to="/"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-on-surface-variant transition-colors hover:text-on-surface sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        exact-active-class="!text-on-surface nav-link-active"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
          <path d="M5 14l.6 1.6L7 16l-1.4.4L5 18l-.6-1.6L3 16l1.4-.4L5 14z" />
        </svg>
        <span>For You</span>
      </NuxtLink>

      <NuxtLink
        to="/mylist"
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-on-surface-variant transition-colors hover:text-on-surface sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-on-surface nav-link-active"
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
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-on-surface-variant transition-colors hover:text-on-surface sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-on-surface nav-link-active"
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
        class="nav-link flex min-w-16 flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[9px] font-medium uppercase tracking-[0.24em] text-on-surface-variant transition-colors hover:text-on-surface sm:gap-1 sm:pt-2 sm:text-[10px] sm:tracking-[0.28em]"
        active-class="!text-on-surface nav-link-active"
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
