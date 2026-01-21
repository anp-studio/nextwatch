<template>
  <div class="h-screen w-full bg-gray-900 text-white flex flex-col font-sans overflow-hidden">
    <main class="flex-1 overflow-y-auto relative">
      <slot />
    </main>

    <nav class="h-16 bg-gray-800 border-t border-gray-700 flex justify-around items-center z-50">
      <NuxtLink
        to="/"
        class="flex flex-col items-center text-gray-400 hover:text-red-500"
        active-class="text-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
        <span class="text-xs mt-1">Home</span>
      </NuxtLink>

      <NuxtLink
        to="/search"
        class="flex flex-col items-center text-gray-400 hover:text-red-500"
        active-class="text-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span class="text-xs mt-1">Search</span>
      </NuxtLink>

      <NuxtLink
        to="/watched"
        class="flex flex-col items-center text-gray-400 hover:text-red-500"
        active-class="text-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="text-xs mt-1">Watched</span>
      </NuxtLink>

      <NuxtLink
        to="/profile"
        class="flex flex-col items-center text-gray-400 hover:text-red-500"
        active-class="text-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span class="text-xs mt-1">Profile</span>
      </NuxtLink>
    </nav>
  </div>
</template>
