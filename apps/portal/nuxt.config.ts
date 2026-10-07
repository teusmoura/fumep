export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  compatibilityDate: "2026-09-25",
  runtimeConfig: {
    apiInternal: process.env.NUXT_API_INTERNAL || "http://127.0.0.1:8002",
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8002" },
  },
});
