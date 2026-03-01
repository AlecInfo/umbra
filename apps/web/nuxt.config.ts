export default defineNuxtConfig({
  compatibilityDate: '2026-02-27',
  devtools: { enabled: true },

  app: {
    head: {
      style: [
        { innerHTML: 'body{background:#0a0a0b}' },
      ],
      link: [
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
})
