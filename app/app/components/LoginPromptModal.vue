<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div
          class="w-full sm:max-w-md sm:mx-4 bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh]"
        >
          <div class="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
            <p class="text-sm text-gray-500 dark:text-gray-400">Sign in to save movies</p>
            <button
              @click="$emit('close')"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="overflow-y-auto flex-1">
            <AuthForm @authenticated="$emit('close')" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
defineEmits(['close'])
</script>
