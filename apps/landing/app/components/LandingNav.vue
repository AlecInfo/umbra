<script setup lang="ts">
const { lang, t, setLang } = useLandingT()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value !== 'light')
function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const scrolled = ref(false)
const mobileOpen = ref(false)

function onScroll() { scrolled.value = window.scrollY > 20 }

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <nav
    class="l-nav"
    :class="{ scrolled }"
  >
    <div class="l-nav-inner">
      <a
        href="#"
        class="l-logo"
      >UMBRA<span class="dot">.</span></a>
      <div class="l-nav-links">
        <a href="#problem">{{ t('nav_why') }}</a>
        <a href="#terminal">{{ t('nav_terminal') }}</a>
        <a href="#how">{{ t('nav_how') }}</a>
        <a href="#opensource">{{ t('nav_opensource') }}</a>
        <a href="#pricing">{{ t('nav_pricing') }}</a>
      </div>
      <div class="l-nav-right">
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
        <a
          href="#waitlist"
          class="btn-primary"
        >{{ t('nav_cta') }}</a>
      </div>
      <button
        class="l-nav-ham"
        aria-label="Menu"
        :aria-expanded="mobileOpen"
        @click="mobileOpen = !mobileOpen"
      >
        <span /><span /><span />
      </button>
    </div>
  </nav>

  <div
    class="l-mob-menu"
    :class="{ open: mobileOpen }"
  >
    <a
      href="#problem"
      @click="mobileOpen = false"
    >{{ t('nav_why') }}</a>
    <a
      href="#terminal"
      @click="mobileOpen = false"
    >{{ t('nav_terminal') }}</a>
    <a
      href="#how"
      @click="mobileOpen = false"
    >{{ t('nav_how') }}</a>
    <a
      href="#opensource"
      @click="mobileOpen = false"
    >{{ t('nav_opensource') }}</a>
    <a
      href="#pricing"
      @click="mobileOpen = false"
    >{{ t('nav_pricing') }}</a>
    <a
      href="#waitlist"
      class="btn-primary"
      @click="mobileOpen = false"
    >{{ t('nav_cta') }}</a>
    <div class="l-mob-controls">
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
</template>
