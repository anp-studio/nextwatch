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
  mdc: {
    highlight: {
      theme: {
        default: "github-light",
        dark: "github-dark",
      },
      langs: [
        "js",
        "ts",
        "python",
        "powershell",
        "bash",
        "json",
        "yaml",
        "html",
        "css",
        "vue",
        "sql",
      ],
    },
  },
});
