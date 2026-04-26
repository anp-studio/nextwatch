// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/transitions.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  runtimeConfig: {
    tmdbApiKey: process.env.NUXT_TMDB_API_KEY ?? '',
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY ?? '',
    libsqlUrl: process.env.NUXT_LIBSQL_URL ?? '',
    libsqlAuthToken: process.env.NUXT_LIBSQL_AUTH_TOKEN ?? '',
    adminToken: process.env.ADMIN_API_TOKEN ?? '',
    supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      hcaptchaSiteKey: process.env.NUXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '',
    },
    upstash: {
      redisUrl: process.env.UPSTASH_REDIS_REST_URL ?? '',
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@supabase/supabase-js',
        '@hcaptcha/vue3-hcaptcha',
      ],
    },
  },
})
