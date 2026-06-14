<template>
  <div class="relative flex h-full flex-col overflow-hidden bg-background">
    <div v-if="user" class="min-h-0 flex-1 overflow-y-auto px-4 pb-20 sm:px-6">
      <div class="mx-auto flex w-full max-w-3xl justify-center">
        <UserProfileHeader />
      </div>
    </div>

    <div v-else class="flex h-full flex-1 flex-col justify-center">
      <AuthForm />
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
</script>
