// Nuxt configuration — https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/sitemap'
  ],

  site: {
    url: 'https://umbravpn.io'
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'UMBRA — Client VPN open-source auto-hébergé | WireGuard',
      meta: [
        { name: 'description', content: 'Reprends le contrôle de ton réseau. UMBRA est un client VPN open-source qui se connecte à ton infrastructure. Tes données ne transitent que par des serveurs que tu contrôles.' },
        { property: 'og:title', content: 'UMBRA — Client VPN open-source auto-hébergé | WireGuard' },
        { property: 'og:description', content: 'Reprends le contrôle de ton réseau. Tes données ne transitent que par des serveurs que tu contrôles.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://umbravpn.io' },
        { property: 'og:site_name', content: 'UMBRA' },
        { property: 'og:image', content: 'https://umbravpn.io/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://umbravpn.io/og-image.png' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' }
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap'
        }
      ],
      style: [
        { children: 'body{background:#0a0a0f}' }
      ]
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
