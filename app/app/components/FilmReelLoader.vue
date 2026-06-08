<template>
  <div class="flex flex-col items-center justify-center gap-5 text-center">
    <svg
      :class="[size, color]"
      class="animate-spin motion-reduce:animate-none drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      :aria-label="label || 'Loading'"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="film-reel-holes">
          <!-- Everything white = visible; black = cut out -->
          <rect width="100" height="100" fill="white" />
          <circle cx="50" cy="50" r="8" fill="black" />
          <!-- Six sprocket holes evenly spaced on a 28px radius -->
          <circle cx="78" cy="50" r="9" fill="black" />
          <circle cx="64" cy="74.25" r="9" fill="black" />
          <circle cx="36" cy="74.25" r="9" fill="black" />
          <circle cx="22" cy="50" r="9" fill="black" />
          <circle cx="36" cy="25.75" r="9" fill="black" />
          <circle cx="64" cy="25.75" r="9" fill="black" />
        </mask>
      </defs>

      <circle cx="50" cy="50" r="46" fill="currentColor" mask="url(#film-reel-holes)" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
    </svg>

    <p
      v-if="label || $slots.default"
      class="text-[12px] font-medium uppercase tracking-[0.24em] text-on-surface-variant"
    >
      <slot>{{ label }}</slot>
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ size?: string; color?: string; label?: string }>(),
  {
    size: 'h-20 w-20',
    color: 'text-white',
    label: 'Finding movies for you…',
  },
)
</script>
