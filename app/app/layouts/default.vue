<template>
  <div class="bg-gray-100 dark:bg-gray-950 h-screen w-full flex font-sans overflow-hidden">
    <div class="bg-white dark:bg-gray-900 w-full h-full flex flex-col relative overflow-hidden">
      <TopHeader />
      <main class="flex-1 relative overflow-hidden">
        <slot />
      </main>
      <BottomNav />
    </div>
  </div>
</template>
