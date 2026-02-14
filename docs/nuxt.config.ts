// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  modules: [
    "@nuxt/content",
    process.env.NODE_ENV === "development" ? "nuxt-studio" : [],
  ].filter(Boolean),
  studio: {
    route: "/_studio",
  },
  devtools: {
    enabled: false,
  },
});
