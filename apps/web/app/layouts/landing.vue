<template>
  <UApp>
    <div class="l-root">
      <!-- NAV -->
      <header class="l-nav" :class="{ 'l-nav--scrolled': scrolled }">
        <div class="l-nav-inner">
          <a href="/landing" class="l-logo">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true">
              <path d="M10 2L19 17H1L10 2Z" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" fill="rgba(79,255,176,.07)"/>
            </svg>
            UMBRA
          </a>

          <nav class="l-nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#comment">Comment</a>
            <a href="#tarifs">Tarifs</a>
          </nav>

          <a href="/login" class="l-nav-cta">Se connecter →</a>
        </div>
      </header>

      <main><slot /></main>

      <!-- FOOTER -->
      <footer class="l-footer">
        <div class="l-footer-inner">
          <div class="l-footer-brand">
            <div class="l-footer-logo">
              <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <path d="M10 2L19 17H1L10 2Z" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
              UMBRA
            </div>
            <p>VPN mesh auto-hébergé, propulsé par<br>WireGuard et Headscale.</p>
            <p class="l-footer-domain">umbravpn.io</p>
          </div>

          <div class="l-footer-cols">
            <div class="l-footer-col">
              <span class="l-footer-col-title">Produit</span>
              <a href="#features">Fonctionnalités</a>
              <a href="#tarifs">Tarifs</a>
              <a href="/login">Accéder à l'app</a>
            </div>
            <div class="l-footer-col">
              <span class="l-footer-col-title">Ressources</span>
              <a href="#">Documentation</a>
              <a href="#">GitHub</a>
              <a href="#">Changelog</a>
            </div>
            <div class="l-footer-col">
              <span class="l-footer-col-title">Légal</span>
              <a href="#">Confidentialité</a>
              <a href="#">CGU</a>
            </div>
          </div>
        </div>

        <div class="l-footer-bottom">
          <span>© 2026 UMBRA · umbravpn.io</span>
          <span>Fait avec soin pour les auto-hébergeurs</span>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const scrolled = ref(false)
let handler: () => void

onMounted(() => {
  handler = () => { scrolled.value = window.scrollY > 40 }
  window.addEventListener('scroll', handler, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', handler)
})
</script>

<style scoped>
.l-root {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-mono);
}

/* ─── NAV ───────────────────────────────────────── */
.l-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  transition: background .3s, border-color .3s, backdrop-filter .3s;
  border-bottom: 1px solid transparent;
}
.l-nav--scrolled {
  background: rgba(10,10,11,.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-color: var(--border);
}
.l-nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 28px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.l-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-disp);
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  text-decoration: none;
  letter-spacing: .04em;
  flex-shrink: 0;
}
.l-nav-links {
  display: flex;
  gap: 28px;
  margin-left: auto;
}
.l-nav-links a {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
  letter-spacing: .03em;
}
.l-nav-links a:hover { color: var(--text); }
.l-nav-cta {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  transition: opacity .15s;
  flex-shrink: 0;
}
.l-nav-cta:hover { opacity: .65; }

/* ─── FOOTER ─────────────────────────────────────── */
.l-footer {
  border-top: 1px solid var(--border);
  padding: 56px 28px 28px;
}
.l-footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  gap: 64px;
  padding-bottom: 48px;
}
.l-footer-brand { flex: 1; }
.l-footer-logo {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-disp);
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 14px;
}
.l-footer-brand p {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.8;
  max-width: 220px;
}
.l-footer-domain {
  margin-top: 10px !important;
  color: var(--accent) !important;
  opacity: .6;
}
.l-footer-cols {
  display: flex;
  gap: 52px;
}
.l-footer-col {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.l-footer-col-title {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .12em;
  margin-bottom: 4px;
}
.l-footer-col a {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
}
.l-footer-col a:hover { color: var(--text); }
.l-footer-bottom {
  max-width: 1100px;
  margin: 0 auto;
  padding-top: 22px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
}
</style>