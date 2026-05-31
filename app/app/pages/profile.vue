<template>
  <div class="relative flex h-full flex-col overflow-hidden bg-background">
    <div
      v-if="user"
      class="flex min-h-full w-full flex-col items-center overflow-y-auto px-4 pb-20 sm:px-6"
    >
      <UserProfileHeader />
    </div>

    <div v-else class="flex h-full flex-1 flex-col justify-center">
      <AuthForm />
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
</script>
