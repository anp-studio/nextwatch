<template>
  <header class="flex justify-between items-center p-4 bg-white z-50">
    <NuxtLink to="/profile" class="text-gray-300 transition-colors" active-class="!text-rose-500">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
        />
      </svg>
    </NuxtLink>

    <NuxtLink
      to="/"
      class="flex items-center bg-gray-50 rounded-full py-1 px-3 shadow-sm transition-all text-gray-300"
      exact-active-class="ring-2 ring-rose-200 !bg-white !text-rose-500"
    >
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"
        />
      </svg>
    </NuxtLink>

    <NuxtLink to="/search" class="text-gray-300 transition-colors" active-class="!text-rose-500">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"
        />
      </svg>
    </NuxtLink>
  </header>
</template>
