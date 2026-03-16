<script setup lang="ts">
const { lang, t, setLang } = useLandingT()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value !== 'light')
function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const scrolled = ref(false)
const mobileOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 20
}

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.body.style.overflow = ''
})
</script>

<template>
  <nav
    class="l-nav"
    :class="{ scrolled }"
  >
    <div class="l-nav-inner">
      <NuxtLink
        to="/"
        class="l-logo"
      >
        UMBRA<span class="dot">.</span>
      </NuxtLink>
      <div class="l-nav-links">
        <NuxtLink to="/#problem">
          {{ t('nav_why') }}
        </NuxtLink>
        <NuxtLink to="/#terminal">
          {{ t('nav_terminal') }}
        </NuxtLink>
        <NuxtLink to="/#how">
          {{ t('nav_how') }}
        </NuxtLink>
        <NuxtLink to="/#opensource">
          {{ t('nav_opensource') }}
        </NuxtLink>
        <NuxtLink to="/#pricing">
          {{ t('nav_pricing') }}
        </NuxtLink>
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
        <NuxtLink
          to="/#waitlist"
          class="btn-primary"
        >
          {{ t('nav_cta') }}
        </NuxtLink>
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
    <NuxtLink
      to="/#problem"
      @click="mobileOpen = false"
    >
      {{ t('nav_why') }}
    </NuxtLink>
    <NuxtLink
      to="/#terminal"
      @click="mobileOpen = false"
    >
      {{ t('nav_terminal') }}
    </NuxtLink>
    <NuxtLink
      to="/#how"
      @click="mobileOpen = false"
    >
      {{ t('nav_how') }}
    </NuxtLink>
    <NuxtLink
      to="/#opensource"
      @click="mobileOpen = false"
    >
      {{ t('nav_opensource') }}
    </NuxtLink>
    <NuxtLink
      to="/#pricing"
      @click="mobileOpen = false"
    >
      {{ t('nav_pricing') }}
    </NuxtLink>
    <NuxtLink
      to="/#waitlist"
      class="btn-primary"
      @click="mobileOpen = false"
    >
      {{ t('nav_cta') }}
    </NuxtLink>
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
