<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div
          class="relative flex max-h-[95dvh] w-full flex-col overflow-y-auto sm:mx-4 sm:max-h-[90vh] sm:max-w-md"
        >
          <button
            aria-label="Close login modal"
            class="absolute right-6 top-6 z-10 rounded-full p-1 text-on-surface-variant transition-colors hover:text-on-surface"
            @click="$emit('close')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <AuthForm @authenticated="$emit('close')" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
defineEmits(['close'])
</script>
