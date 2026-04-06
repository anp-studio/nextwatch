<template>
  <header class="w-full bg-white dark:bg-gray-800 z-50">
    <div class="flex justify-between items-center p-4 w-full max-w-md mx-auto">
      <NuxtLink
        to="/profile"
        class="text-gray-300 dark:text-gray-500 transition-colors hover:text-rose-400"
        active-class="!text-rose-500"
      >
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </NuxtLink>

      <NuxtLink
        to="/"
        class="flex items-center bg-gray-50 dark:bg-gray-700 rounded-full py-1 px-3 shadow-sm transition-all text-gray-300 dark:text-gray-500 hover:text-rose-400"
        exact-active-class="ring-2 ring-rose-200 !bg-white dark:!bg-gray-600 !text-rose-500"
      >
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"
          />
        </svg>
      </NuxtLink>

      <NuxtLink
        to="/chat"
        class="text-gray-300 dark:text-gray-500 transition-colors hover:text-rose-400"
        active-class="!text-rose-500"
      >
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
      </NuxtLink>

      <NuxtLink
        to="/search"
        class="text-gray-300 dark:text-gray-500 transition-colors hover:text-rose-400"
        active-class="!text-rose-500"
      >
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z"
          />
        </svg>
      </NuxtLink>

      <button
        @click="toggleDark()"
        class="text-gray-300 dark:text-gray-500 transition-colors hover:text-rose-400"
      >
        <svg v-if="isDark" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
        </svg>
        <svg v-else class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
const mode = useColorMode()
const isDark = computed(() => mode.value === 'dark')
const toggleDark = () => {
  mode.value = isDark.value ? 'light' : 'dark'
}
</script>
