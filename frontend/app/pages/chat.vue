<template>
  <div class="flex flex-col h-[calc(100vh-72px)] max-w-md mx-auto bg-white dark:bg-gray-800">
    <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <svg class="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
        <p class="text-lg font-medium">Start a conversation</p>
        <p class="text-sm mt-1">Ask anything about movies!</p>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
          :class="msg.role === 'user'
            ? 'bg-rose-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'"
        >
          {{ msg.content }}
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input
          v-model="input"
          type="text"
          placeholder="Type a message..."
          class="flex-1 rounded-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <button
          type="submit"
          :disabled="!input.trim()"
          class="bg-rose-500 text-white rounded-full p-2 transition-colors hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const messages = ref([])
const input = ref('')
const messagesContainer = ref(null)

const sendMessage = async () => {
  const text = input.value.trim()
  if (!text) return

  messages.value.push({ role: 'user', content: text })
  input.value = ''

  await nextTick()
  scrollToBottom()
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}
</script>
