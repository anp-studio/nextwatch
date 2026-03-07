// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt'],
  runtimeConfig: {
    adminToken: process.env.ADMIN_API_TOKEN,
    tmdbApiKey: '',
    public: {
      supabaseUrl: '',
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  },
})
