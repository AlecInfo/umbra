/*
| UMBRA_APP=1 builds the same application for the Tauri shells — desktop,
| tablet and phone — instead of for a server.
|
| Two things have to change and nothing else. Rendering becomes client-only:
| there is no Node process inside the bundle to render a page, and the server
| the app talks to is not known until someone types its address. And the output
| becomes a plain directory of files, which is what Tauri embeds.
|
| Everything else is deliberately shared. The pages, the styles, the responsive
| breakpoints and the middleware that sends narrow viewports to /mobile are the
| product; the shell only decides where it runs.
*/
const isApp = process.env.UMBRA_APP === '1'

export default defineNuxtConfig({
  compatibilityDate: '2026-02-27',
  devtools: { enabled: true },

  ssr: !isApp,

  app: {
    head: {
      // viewport-fit=cover lets the app paint under the notch; the
      // env(safe-area-inset-*) paddings in the mobile pages are 0 without it.
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      style: [
        { innerHTML: 'body{background:#0a0a0b}' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
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
  // JetBrains Mono and Syne are downloaded at build time by @nuxt/fonts (via
  // @nuxt/ui) and served from /_fonts. There used to be a Google Fonts <link>
  // as well: every visitor of a self-hosted VPN dashboard fetched the fonts a
  // second time and handed their IP to Google — and the offline app had none.
  colorMode: {
    preference: 'dark',
    fallback:   'dark',
  },
  ui: {
    theme: {
      colors: ['umbra'],
    },
  },
  // A directory of static files for Tauri to embed. `nuxt generate` would set
  // this too, but the flag has to drive it so one command covers every shell.
  nitro: isApp ? { preset: 'static' } : {},

  runtimeConfig: {
    apiBaseSsr: process.env.NUXT_API_BASE_SSR || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333/api/v1',
    },
  },
})
