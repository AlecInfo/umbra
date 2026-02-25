export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt'],

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/global.css',
  ],

  typescript: {
    typeCheck: false,
  },

  runtimeConfig: {
    public: {
      apiBase: 'https://api.umbravpn.io',
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],
})