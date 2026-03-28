<template>
  <div class="bg-gray-100 h-screen w-full flex justify-center font-sans overflow-hidden">
    <div class="bg-white w-full max-w-md h-full flex flex-col relative shadow-2xl overflow-hidden">
      <TopNav />
      <main class="flex-1 relative overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>
