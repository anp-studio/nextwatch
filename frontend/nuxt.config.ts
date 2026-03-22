// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxt/eslint'],
  runtimeConfig: {
    tmdbApiKey: process.env.NUXT_TMDB_API_KEY ?? '',
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY ?? '',
    libsqlUrl: process.env.NUXT_LIBSQL_URL ?? '',
    libsqlAuthToken: process.env.NUXT_LIBSQL_AUTH_TOKEN ?? '',
    adminToken: process.env.ADMIN_API_TOKEN ?? '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '0 8 * * *': ['tmdb-import'],
    },
  },
})
