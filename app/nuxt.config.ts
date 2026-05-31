import { createThemeBootstrapScript } from './app/utils/theme'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/transitions.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      script: [
        {
          innerHTML: createThemeBootstrapScript(),
          tagPosition: 'head',
        },
      ],
    },
  },
  runtimeConfig: {
    tmdbApiKey: process.env.NUXT_TMDB_API_KEY ?? '',
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY ?? '',
    libsqlUrl: process.env.NUXT_LIBSQL_URL ?? '',
    libsqlAuthToken: process.env.NUXT_LIBSQL_AUTH_TOKEN ?? '',
    adminToken: process.env.ADMIN_API_TOKEN ?? '',
    supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY ?? '',
    hcaptchaSecretKey: process.env.NUXT_HCAPTCHA_SECRET ?? '',
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
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "img-src 'self' data: https://image.tmdb.org https://*.supabase.co https://*.ytimg.com",
          "script-src 'self' 'unsafe-inline' https://js.hcaptcha.com https://www.youtube.com https://hcaptcha.com",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' https://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com https://www.youtube.com",
          'frame-src https://*.hcaptcha.com https://www.youtube.com https://www.youtube-nocookie.com',
          "font-src 'self'",
          "form-action 'self'",
        ].join('; '),
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      },
    },
  },
})
