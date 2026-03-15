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
          <a href="#problem">{{ t('nav_why') }}</a>
          <a href="#pricing">{{ t('nav_pricing') }}</a>
          <a href="#how">{{ t('nav_how') }}</a>
          <a href="#">{{ t('footer_changelog') }}</a>
        </div>
        <div class="l-footer-col">
          <div class="l-footer-col-title">
            {{ t('footer_col2') }}
          </div>
          <a href="#">{{ t('footer_docs') }}</a>
          <a href="#">{{ t('footer_api') }}</a>
          <a
            href="https://github.com/umbravpn"
            target="_blank"
            rel="noopener"
          >GitHub</a>
          <a href="#">{{ t('footer_agent') }}</a>
        </div>
        <div class="l-footer-col">
          <div class="l-footer-col-title">
            {{ t('footer_col3') }}
          </div>
          <a href="#">{{ t('footer_about') }}</a>
          <a href="mailto:contact@umbravpn.io">{{ t('footer_contact') }}</a>
          <a href="#">{{ t('footer_privacy') }}</a>
          <a href="#">{{ t('footer_terms') }}</a>
        </div>
      </div>
    </div>
    <div class="l-footer-bottom">
      <div class="l-footer-copy">
        {{ t('footer_copy') }}
      </div>
      <div class="l-footer-links">
        <a href="#">{{ t('footer_privacy') }}</a>
        <a href="#">{{ t('footer_terms') }}</a>
      </div>
    </div>
  </footer>
</template>
