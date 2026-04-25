export default defineNuxtConfig({
  compatibilityDate: '2026-02-27',
  devtools: { enabled: true },

  app: {
    head: {
      style: [
        { innerHTML: 'body{background:#0a0a0b}' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@600;700;800&display=swap' },
      ],
    },
  },
  modules: [
    '@nuxt/devtools',
    '@nuxt/ui',
    'nuxt-charts',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback:   'dark',
  },
  ui: {
    theme: {
      colors: ['umbra'],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333/api/v1',
    },
  },
})
