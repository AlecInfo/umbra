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
      title: 'UMBRA — Open-source self-hosted VPN client | WireGuard',
      meta: [
        { name: 'description', content: 'Take back control of your network. UMBRA is an open-source self-hosted VPN manager built on WireGuard. Your data only flows through servers you control.' },
        { name: 'keywords', content: 'umbra, umbra vpn, umbravpn, self-hosted vpn, wireguard manager, open-source vpn, vpn mesh network, headscale, wireguard gui, vpn manager' },
        { property: 'og:title', content: 'UMBRA — Open-source self-hosted VPN manager' },
        { property: 'og:description', content: 'Take back control of your network. Self-hosted VPN manager built on WireGuard. Your data only flows through servers you control.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://umbravpn.io' },
        { property: 'og:site_name', content: 'UMBRA' },
        { property: 'og:image', content: 'https://umbravpn.io/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'fr_FR' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'UMBRA — Open-source self-hosted VPN manager' },
        { name: 'twitter:description', content: 'Self-hosted VPN manager built on WireGuard. Your data, your servers.' },
        { name: 'twitter:image', content: 'https://umbravpn.io/og-image.png' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { charset: 'utf-8' }
      ],
      link: [
        { rel: 'canonical', href: 'https://umbravpn.io' },
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
      script: [
        { src: 'https://cloud.umami.is/script.js', defer: true, 'data-website-id': '26d4bc75-2dc2-4f7e-9c32-a143420dbaf4' },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'UMBRA',
            'applicationCategory': 'NetworkApplication',
            'operatingSystem': 'Linux, macOS, Windows',
            'description': 'Open-source self-hosted VPN manager built on WireGuard. Deploy lightweight agents on your machines to form a personal mesh network.',
            'url': 'https://umbravpn.io',
            'image': 'https://umbravpn.io/og-image.png',
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'EUR'
            },
            'author': {
              '@type': 'Organization',
              'name': 'UMBRA',
              'url': 'https://umbravpn.io'
            }
          })
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
    '/': { prerender: true },
    '/about': { prerender: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/favicon.**': { headers: { 'cache-control': 'public, max-age=604800' } },
    '/og-image.png': { headers: { 'cache-control': 'public, max-age=604800' } }
  },

  nitro: {
    compressPublicAssets: true
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
