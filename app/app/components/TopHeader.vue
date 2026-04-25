<template>
  <header class="w-full bg-white dark:bg-gray-800 z-50 border-b border-gray-100 dark:border-gray-700">
    <div class="flex justify-between items-center px-4 py-3 w-full max-w-md mx-auto">
      <span class="text-xl font-bold text-gray-800 dark:text-white tracking-tight">recc</span>
      <button
        @click="toggleDark()"
        class="theme-toggle btn-press text-gray-400 dark:text-gray-500 transition-colors hover:text-rose-400"
      >
        <ClientOnly>
        <Transition name="icon-spin" mode="out-in">
          <svg v-if="isDark" key="sun" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
          </svg>
          <svg v-else key="moon" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
          </svg>
        </Transition>
        </ClientOnly>
      </button>
    </div>
  </header>
</template>

<script setup>
const mode = useColorMode()
const isDark = computed(() => mode.value === 'dark')
const toggleDark = () => {
  const el = document.documentElement
  el.classList.add('theme-transitioning')
  mode.value = isDark.value ? 'light' : 'dark'
  setTimeout(() => el.classList.remove('theme-transitioning'), 400)
}
</script>
