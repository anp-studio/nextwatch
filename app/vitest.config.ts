import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.nuxt.test.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
              overrides: {
                runtimeConfig: {
                  adminToken: 'test-admin-token',
                  supabaseServiceRoleKey: 'test-service-role-key',
                  hcaptchaSecretKey: 'test-hcaptcha-secret',
                  public: {
                    supabaseUrl: 'https://example.supabase.co',
                    supabaseKey: 'test-supabase-key',
                    hcaptchaSiteKey: 'test-hcaptcha-key',
                  },
                },
              },
            },
          },
        },
      }),
    ],
  },
})
