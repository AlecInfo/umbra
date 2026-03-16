<script setup lang="ts">
const { lang, t } = useLandingT()
const toast = useToast()

// ── SEO réactif selon la langue ──────────────────────────────────
useSeoMeta({
  description: () => lang.value === 'fr'
    ? 'Reprends le contrôle de ton réseau. UMBRA est un client VPN open-source qui se connecte à ton infrastructure. Tes données ne transitent que par des serveurs que tu contrôles.'
    : 'Take back control of your network. UMBRA is an open-source VPN client that connects to your own infrastructure. Your data only flows through servers you control.'
})
useHead(computed(() => ({ htmlAttrs: { lang: lang.value } })))

// ── Waitlist forms ───────────────────────────────────────────────
const heroEmail = ref('')
const heroSent = ref(false)
const ctaEmail = ref('')
const ctaSent = ref(false)

async function submitHero() {
  if (!heroEmail.value) return
  try {
    await $fetch('/api/waitlist', { method: 'POST', body: { email: heroEmail.value } })
    heroSent.value = true
    toast.add({
      title: lang.value === 'fr' ? 'Tu es sur la liste !' : 'You\'re on the list!',
      description: lang.value === 'fr' ? 'On te prévient dès que c\'est prêt.' : 'We\'ll let you know when it\'s ready.',
      icon: 'i-lucide-mail-check',
      color: 'success',
      duration: 5000
    })
  } catch (err: unknown) {
    const fetchErr = err as { data?: { error?: string } }
    const msg = fetchErr?.data?.error || (lang.value === 'fr' ? 'Une erreur est survenue.' : 'Something went wrong.')
    toast.add({
      title: lang.value === 'fr' ? 'Erreur' : 'Error',
      description: msg,
      icon: 'i-lucide-alert-triangle',
      color: 'error',
      duration: 5000
    })
  }
}

async function submitCta() {
  if (!ctaEmail.value) return
  try {
    await $fetch('/api/waitlist', { method: 'POST', body: { email: ctaEmail.value } })
    ctaSent.value = true
    toast.add({
      title: lang.value === 'fr' ? 'Tu es sur la liste !' : 'You\'re on the list!',
      description: lang.value === 'fr' ? 'Aucun spam — juste un ping quand c\'est prêt.' : 'No spam — just a ping when ready.',
      icon: 'i-lucide-mail-check',
      color: 'success',
      duration: 5000
    })
  } catch (err: unknown) {
    const fetchErr = err as { data?: { error?: string } }
    const msg = fetchErr?.data?.error || (lang.value === 'fr' ? 'Une erreur est survenue.' : 'Something went wrong.')
    toast.add({
      title: lang.value === 'fr' ? 'Erreur' : 'Error',
      description: msg,
      icon: 'i-lucide-alert-triangle',
      color: 'error',
      duration: 5000
    })
  }
}

// ── Reveal animation (IntersectionObserver global) ───────────────
let revealObs: IntersectionObserver | null = null

function setupReveal() {
  revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible')
        revealObs?.unobserve(e.target)
      }
    })
  }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' })
  document.querySelectorAll('.reveal').forEach(el => revealObs!.observe(el))
}

onMounted(() => {
  nextTick(setupReveal)
})
onUnmounted(() => {
  revealObs?.disconnect()
})
</script>

<template>
  <div>
    <LandingBanner />
    <LandingNav />

    <!-- ─── S1 HERO ──────────────────────────────────────── -->
    <section class="l-hero">
      <div class="l-hero-inner">
        <div class="l-hero-text">
          <div class="l-eyebrow">
            <span class="l-eyebrow-dot" />
            {{ t('hero_eyebrow') }}
          </div>
          <h1 class="l-hero-title">
            {{ t('hero_t1') }}<br>
            {{ t('hero_t2') }}<br>
            <span class="l-title-grad">{{ t('hero_t3') }}</span>
          </h1>
          <p class="l-hero-sub">
            {{ t('hero_sub') }}
          </p>
          <div class="l-hero-email-wrap">
            <form
              class="l-email-form"
              style="max-width:460px"
              @submit.prevent="submitHero"
            >
              <label
                for="hero-email"
                class="sr-only"
              >Email</label>
              <input
                id="hero-email"
                v-model="heroEmail"
                class="l-email-inp"
                type="email"
                :placeholder="t('email_ph')"
                :disabled="heroSent"
                autocomplete="email"
              >
              <button
                type="submit"
                :class="['btn-primary', { 'btn-sent': heroSent }]"
              >
                {{ heroSent ? t('hero_sent') : t('hero_cta') }}
              </button>
            </form>
            <p class="l-email-note">
              {{ t('hero_note') }}
            </p>
          </div>
        </div>
      </div>

      <LandingGlobe />

      <div
        class="l-hero-scroll"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width="18"
          height="18"
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </section>

    <!-- Stats strip -->
    <div class="l-strip">
      <div class="l-strip-inner">
        <div class="l-strip-item reveal">
          <div
            class="l-strip-val"
            style="font-size:18px;letter-spacing:.02em"
          >
            WireGuard
          </div>
          <div class="l-strip-lbl">
            {{ t('strip_proto') }}
          </div>
        </div>
        <div class="l-strip-item reveal d1">
          <div class="l-strip-val">
            E2E
          </div>
          <div class="l-strip-lbl">
            {{ t('strip_enc') }}
          </div>
        </div>
        <div class="l-strip-item reveal d2">
          <div
            class="l-strip-val"
            style="color:var(--accent)"
          >
            &lt; 5ms
          </div>
          <div class="l-strip-lbl">
            {{ t('strip_lat') }}
          </div>
        </div>
        <div class="l-strip-item reveal d3">
          <div
            class="l-strip-val"
            style="color:var(--accent)"
          >
            100%
          </div>
          <div class="l-strip-lbl">
            {{ t('strip_self') }}
          </div>
        </div>
      </div>
    </div>

    <!-- ─── S2 LE PROBLÈME ────────────────────────────────── -->
    <section
      id="problem"
      class="l-section alt"
    >
      <div class="wrap">
        <div class="l-sh reveal">
          <div class="l-sh-eyebrow">
            {{ t('prob_eyebrow') }}
          </div>
          <h2 class="l-sh-title">
            {{ t('prob_t1') }}<br>
            <span style="color:var(--muted)">{{ t('prob_t2') }}</span>
          </h2>
        </div>
        <div class="l-prob-grid">
          <div class="l-prob-card reveal">
            <div class="l-prob-num">
              01
            </div>
            <div class="l-prob-title">
              {{ t('prob_1t') }}
            </div>
            <div class="l-prob-desc">
              {{ t('prob_1d') }}
            </div>
          </div>
          <div class="l-prob-card reveal d1">
            <div class="l-prob-num">
              02
            </div>
            <div class="l-prob-title">
              {{ t('prob_2t') }}
            </div>
            <div class="l-prob-desc">
              {{ t('prob_2d') }}
            </div>
          </div>
          <div class="l-prob-card reveal d2">
            <div class="l-prob-num">
              03
            </div>
            <div class="l-prob-title">
              {{ t('prob_3t') }}
            </div>
            <div class="l-prob-desc">
              {{ t('prob_3d') }}
            </div>
          </div>
        </div>
        <div class="l-prob-transition reveal d3">
          <em>{{ t('prob_transition') }}</em>
        </div>
      </div>
    </section>

    <!-- ─── S3 TERMINAL ───────────────────────────────────── -->
    <LandingTerminal />

    <!-- ─── S4 FONCTIONNALITÉS ────────────────────────────── -->
    <section class="l-section alt">
      <div class="wrap">
        <div
          class="l-sh reveal"
          style="margin-bottom:48px"
        >
          <div class="l-sh-eyebrow">
            {{ t('pill_eyebrow') }}
          </div>
          <h2 class="l-sh-title">
            {{ t('pill_title') }}
          </h2>
        </div>
        <div class="l-feat-grid">
          <div class="l-feat-card reveal">
            <div class="l-feat-card-num">
              01
            </div>
            <div class="l-feat-icon g">
              <UIcon
                name="i-lucide-shield-off"
                style="width:18px;height:18px"
              />
            </div>
            <div class="l-feat-card-title">
              {{ t('pill_1t') }}
            </div>
            <div class="l-feat-card-desc">
              {{ t('pill_1d') }}
            </div>
            <div class="l-feat-card-proof">
              <span class="l-feat-proof-tag accent">{{ t('pill_1_tag1') }}</span>
              <span class="l-feat-proof-tag">{{ t('pill_1_tag2') }}</span>
            </div>
          </div>
          <div class="l-feat-card reveal d1">
            <div class="l-feat-card-num">
              02
            </div>
            <div class="l-feat-icon p">
              <UIcon
                name="i-lucide-zap"
                style="width:18px;height:18px"
              />
            </div>
            <div class="l-feat-card-title">
              {{ t('pill_2t') }}
            </div>
            <div class="l-feat-card-desc">
              {{ t('pill_2d') }}
            </div>
            <div class="l-feat-card-proof">
              <div class="l-feat-proof-stat">
                <span class="l-feat-proof-val">&lt;5</span><span class="l-feat-proof-unit">ms</span>
              </div>
              <span class="l-feat-proof-tag">{{ t('pill_2_tag1') }}</span>
            </div>
          </div>
          <div class="l-feat-card reveal d2">
            <div class="l-feat-card-num">
              03
            </div>
            <div class="l-feat-icon b">
              <UIcon
                name="i-lucide-github"
                style="width:18px;height:18px"
              />
            </div>
            <div class="l-feat-card-title">
              {{ t('pill_3t') }}
            </div>
            <div class="l-feat-card-desc">
              {{ t('pill_3d') }}
            </div>
            <div class="l-feat-card-proof">
              <span class="l-feat-proof-tag">Apache 2.0</span>
              <span class="l-feat-proof-tag">{{ t('pill_3_tag2') }}</span>
            </div>
          </div>
          <div class="l-feat-card reveal d3">
            <div class="l-feat-card-num">
              04
            </div>
            <div class="l-feat-icon y">
              <UIcon
                name="i-lucide-layout-dashboard"
                style="width:18px;height:18px"
              />
            </div>
            <div class="l-feat-card-title">
              {{ t('pill_4t') }}
            </div>
            <div class="l-feat-card-desc">
              {{ t('pill_4d') }}
            </div>
            <div class="l-feat-card-proof">
              <span class="l-feat-proof-tag"><UIcon
                name="i-lucide-globe"
                style="width:9px;height:9px"
              />Web</span>
              <span class="l-feat-proof-tag"><UIcon
                name="i-lucide-monitor"
                style="width:9px;height:9px"
              />Desktop</span>
              <span class="l-feat-proof-tag"><UIcon
                name="i-lucide-smartphone"
                style="width:9px;height:9px"
              />Mobile</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── S5 DÉMO INTERACTIVE ───────────────────────────── -->
    <LandingDemo />

    <!-- ─── S6 COMMENT ÇA MARCHE ──────────────────────────── -->
    <section
      id="how"
      class="l-section alt"
    >
      <div class="wrap">
        <div class="l-how-grid">
          <div class="l-how-header reveal">
            <div class="l-sh-eyebrow">
              {{ t('how_eyebrow') }}
            </div>
            <h2
              class="l-sh-title"
              style="margin-top:12px"
            >
              {{ t('how_title') }}
            </h2>
            <p
              class="l-sh-sub"
              style="margin-top:16px"
            >
              {{ t('how_sub') }}
            </p>
            <div
              class="l-how-note"
              style="margin-top:32px"
            >
              <strong>{{ t('how_note_label') }} :</strong> {{ t('how_note') }}
            </div>
          </div>
          <div class="l-timeline">
            <div class="l-tl-item reveal d1">
              <div class="l-tl-num">
                1
              </div>
              <div class="l-tl-content">
                <div class="l-tl-title">
                  {{ t('how_1t') }}
                </div>
                <div class="l-tl-desc">
                  {{ t('how_1d') }}
                </div>
                <div class="l-tl-code block">
                  <span class="cmd-line"><span class="cmd-prompt">$ </span>curl -fsSL https://get.umbravpn.io | sh</span>
                  <span class="cmd-line muted">✓ Headscale · WireGuard · API · Dashboard</span>
                </div>
              </div>
            </div>
            <div class="l-tl-item reveal d2">
              <div class="l-tl-num">
                2
              </div>
              <div class="l-tl-content">
                <div class="l-tl-title">
                  {{ t('how_2t') }}
                </div>
                <div class="l-tl-desc">
                  {{ t('how_2d') }}
                </div>
                <div class="l-tl-code block white">
                  <span class="cmd-line"><span class="cmd-prompt">$ </span>curl -sSL https://get.umbravpn.io | bash -s -- \</span>
                  <span class="cmd-line">&nbsp;&nbsp;--name=<span class="green">raspi-home</span> \</span>
                  <span class="cmd-line">&nbsp;&nbsp;--token=<span class="purple">umbra_reg_a4f2e9c3d1b0...</span></span>
                </div>
              </div>
            </div>
            <div class="l-tl-item reveal d3">
              <div class="l-tl-num">
                3
              </div>
              <div class="l-tl-content">
                <div class="l-tl-title">
                  {{ t('how_3t') }}
                </div>
                <div class="l-tl-desc">
                  {{ t('how_3d') }}
                </div>
                <div class="l-tl-code blue">
                  ● raspi-home — {{ t('how_step3_status') }} — 2ms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── S7 OPEN-SOURCE ────────────────────────────────── -->
    <section
      id="opensource"
      class="l-section alt"
    >
      <div class="wrap">
        <div class="l-sh center reveal">
          <div class="l-sh-eyebrow">
            {{ t('os_eyebrow') }}
          </div>
          <h2 class="l-sh-title">
            {{ t('os_title') }}
          </h2>
          <p
            class="l-sh-sub"
            style="margin-top:12px"
          >
            {{ t('os_desc') }}
          </p>
        </div>

        <div class="l-os-flow reveal d1">
          <div class="l-os-flow-step">
            <div class="l-os-flow-icon">
              <UIcon
                name="i-lucide-monitor"
                style="width:22px;height:22px"
              />
            </div>
            <div class="l-os-flow-label">
              {{ t('os_devices') }}
            </div>
            <div class="l-os-flow-sub">
              macOS · Linux · iOS
            </div>
          </div>
          <div class="l-os-flow-connector">
            <div class="l-os-flow-line" />
            <div class="l-os-flow-badge">
              UMBRA
            </div>
            <div class="l-os-flow-line" />
          </div>
          <div class="l-os-flow-step accent">
            <div class="l-os-flow-icon">
              <UIcon
                name="i-lucide-server"
                style="width:22px;height:22px"
              />
            </div>
            <div class="l-os-flow-label">
              {{ t('os_servers') }}
            </div>
            <div class="l-os-flow-sub">
              WireGuard · Headscale
            </div>
          </div>
          <div class="l-os-flow-connector">
            <div class="l-os-flow-line" />
            <div class="l-os-flow-badge muted">
              {{ t('os_encrypted') }}
            </div>
            <div class="l-os-flow-line" />
          </div>
          <div class="l-os-flow-step">
            <div class="l-os-flow-icon">
              <UIcon
                name="i-lucide-globe"
                style="width:22px;height:22px"
              />
            </div>
            <div class="l-os-flow-label">
              Internet
            </div>
            <div class="l-os-flow-sub">
              {{ t('os_via_infra') }}
            </div>
          </div>
        </div>

        <div class="l-os-notp reveal d2">
          <UIcon
            name="i-lucide-shield-check"
            style="width:13px;height:13px;color:var(--accent);flex-shrink:0"
          />
          {{ t('os_notp_txt') }}
        </div>

        <div class="l-os-cta reveal d3">
          <div class="l-os-quote">
            {{ t('os_trust') }} <span style="color:var(--accent);font-style:normal">{{ t('os_code') }}</span>
          </div>
          <div class="l-os-cta-row">
            <a
              href="https://github.com/umbravpn"
              target="_blank"
              rel="noopener"
              class="btn-primary lg"
            >
              <UIcon
                name="i-lucide-github"
                style="width:16px;height:16px"
              />
              {{ t('os_btn') }}
            </a>
            <div class="l-os-tags-inline">
              <span class="l-os-tag">Apache 2.0</span>
              <span class="l-os-tag">TypeScript + Nuxt 4</span>
              <span class="l-os-tag">Go agent</span>
              <span class="l-os-tag">WireGuard</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── S8 PRICING ────────────────────────────────────── -->
    <section
      id="pricing"
      class="l-section alt"
    >
      <div class="wrap">
        <div class="l-sh center reveal">
          <div class="l-sh-eyebrow">
            {{ t('pr_eyebrow') }}
          </div>
          <h2 class="l-sh-title">
            {{ t('pr_title') }}
          </h2>
          <p
            class="l-plans-sub reveal"
            style="margin-top:16px"
          >
            {{ t('pr_sub') }}
          </p>
        </div>
      </div>
    </section>

    <!-- ─── S9 CAS D'USAGE ────────────────────────────────── -->
    <section class="l-section">
      <div class="wrap">
        <div class="l-sh center reveal">
          <div class="l-sh-eyebrow">
            {{ t('use_eyebrow') }}
          </div>
          <h2 class="l-sh-title">
            {{ t('use_title') }}
          </h2>
        </div>
        <div class="l-use-grid">
          <div class="l-use-card reveal">
            <div class="l-use-icon g">
              <UIcon
                name="i-lucide-laptop"
                style="width:20px;height:20px"
              />
            </div>
            <div class="l-use-label">
              {{ t('use_1_label') }}
            </div>
            <div class="l-use-name">
              {{ t('use_1_name') }}
            </div>
            <p class="l-use-quote">
              {{ t('use_1_quote') }}
            </p>
          </div>
          <div class="l-use-card reveal d1">
            <div class="l-use-icon p">
              <UIcon
                name="i-lucide-users"
                style="width:20px;height:20px"
              />
            </div>
            <div class="l-use-label">
              {{ t('use_2_label') }}
            </div>
            <div class="l-use-name">
              {{ t('use_2_name') }}
            </div>
            <p class="l-use-quote">
              {{ t('use_2_quote') }}
            </p>
          </div>
          <div class="l-use-card reveal d2">
            <div class="l-use-icon b">
              <UIcon
                name="i-lucide-lock"
                style="width:20px;height:20px"
              />
            </div>
            <div class="l-use-label">
              {{ t('use_3_label') }}
            </div>
            <div class="l-use-name">
              {{ t('use_3_name') }}
            </div>
            <p class="l-use-quote">
              {{ t('use_3_quote') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── S10 WAITLIST CTA ──────────────────────────────── -->
    <section
      id="waitlist"
      class="l-cta"
    >
      <h2 class="l-cta-title reveal">
        {{ t('cta_t1') }}<br>
        <span class="l-title-grad">{{ t('cta_t2') }}</span>
      </h2>
      <p class="l-cta-sub reveal d1">
        {{ t('cta_sub') }}
      </p>
      <form
        class="l-email-form reveal d2"
        style="max-width:460px"
        @submit.prevent="submitCta"
      >
        <label
          for="cta-email"
          class="sr-only"
        >Email</label>
        <input
          id="cta-email"
          v-model="ctaEmail"
          class="l-email-inp"
          type="email"
          :placeholder="t('email_ph')"
          :disabled="ctaSent"
          autocomplete="email"
        >
        <button
          type="submit"
          :class="['btn-primary', { 'btn-sent': ctaSent }]"
        >
          {{ ctaSent ? t('cta_sent') : t('cta_btn') }}
        </button>
      </form>
      <p class="l-email-note reveal d3">
        {{ t('cta_note') }}
      </p>
    </section>

    <LandingFooter />
  </div>
</template>
