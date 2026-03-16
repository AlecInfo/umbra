<script setup lang="ts">
const { lang, t, setLang } = useLandingT()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value !== 'light')
function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <footer class="l-footer">
    <div class="l-footer-top">
      <div>
        <div class="l-footer-brand-logo">
          UMBRA<span class="dot">.</span>
        </div>
        <div class="l-footer-brand-sub">
          {{ t('footer_sub') }}
        </div>
        <div class="l-footer-controls">
          <div class="btn-lang">
            <span
              class="btn-lang-opt"
              :class="{ active: lang === 'fr' }"
              @click="setLang('fr')"
            >FR</span>
            <div class="btn-lang-sep" />
            <span
              class="btn-lang-opt"
              :class="{ active: lang === 'en' }"
              @click="setLang('en')"
            >EN</span>
          </div>
          <button
            class="btn-icon"
            aria-label="Toggle theme"
            @click="toggleTheme"
          >
            {{ isDark ? '☀' : '☾' }}
          </button>
        </div>
      </div>
      <div class="l-footer-cols">
        <div class="l-footer-col">
          <div class="l-footer-col-title">
            {{ t('footer_col1') }}
          </div>
          <NuxtLink to="/#problem">
            {{ t('nav_why') }}
          </NuxtLink>
          <NuxtLink to="/#pricing">
            {{ t('nav_pricing') }}
          </NuxtLink>
          <NuxtLink to="/#how">
            {{ t('nav_how') }}
          </NuxtLink>
          <NuxtLink to="/#how">
            {{ t('footer_changelog') }}
          </NuxtLink>
        </div>
        <div class="l-footer-col">
          <div class="l-footer-col-title">
            {{ t('footer_col2') }}
          </div>
          <NuxtLink to="/">
            {{ t('footer_docs') }}
          </NuxtLink>
          <NuxtLink to="/">
            {{ t('footer_api') }}
          </NuxtLink>
          <a
            href="https://github.com/umbravpn"
            target="_blank"
            rel="noopener"
          >GitHub</a>
          <NuxtLink to="/">
            {{ t('footer_agent') }}
          </NuxtLink>
        </div>
        <div class="l-footer-col">
          <div class="l-footer-col-title">
            {{ t('footer_col3') }}
          </div>
          <NuxtLink to="/">
            {{ t('footer_about') }}
          </NuxtLink>
          <NuxtLink to="/#waitlist">
            {{ t('footer_contact') }}
          </NuxtLink>
          <NuxtLink to="/privacy">
            {{ t('footer_privacy') }}
          </NuxtLink>
          <NuxtLink to="/terms">
            {{ t('footer_terms') }}
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="l-footer-bottom">
      <div class="l-footer-copy">
        {{ t('footer_copy') }}
      </div>
      <div class="l-footer-links">
        <NuxtLink to="/privacy">
          {{ t('footer_privacy') }}
        </NuxtLink>
        <NuxtLink to="/terms">
          {{ t('footer_terms') }}
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
