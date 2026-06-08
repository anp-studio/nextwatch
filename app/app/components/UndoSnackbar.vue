<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="action"
        class="fixed left-1/2 top-20 z-[60] flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-full border border-outline-variant bg-surface-container-lowest px-5 py-3 text-on-surface shadow-glow"
      >
        <span class="truncate text-sm">
          <strong>{{ action.title }}</strong>
          {{ action.message }}
        </span>
        <button
          class="whitespace-nowrap text-sm font-semibold text-on-surface transition-colors hover:text-on-surface-variant"
          @click="emit('undo')"
        >
          Undo
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ action: { title: string; message: string } | null }>()
const emit = defineEmits<{ undo: [] }>()
</script>
