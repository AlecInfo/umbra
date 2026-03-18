<script setup lang="ts">
const { t } = useLandingT()
useHead({ title: 'UMBRA — About' })
useSeoMeta({
  description: 'Learn about UMBRA, the open-source self-hosted VPN manager built on WireGuard. Our mission: give everyone control over their network infrastructure.'
})
</script>

<template>
  <div>
    <LandingNav />
    <div
      class="wrap"
      style="padding-top:calc(var(--nav-h) + 48px);padding-bottom:96px;max-width:720px"
    >
      <h1 class="legal-title">
        {{ t('about_title') }}
      </h1>
      <div class="legal-body">
        <p>{{ t('about_intro') }}</p>

        <h2 class="legal-h2">
          {{ t('about_origin_title') }}
        </h2>
        <p>{{ t('about_origin') }}</p>

        <h2 class="legal-h2">
          {{ t('about_what_title') }}
        </h2>
        <p>{{ t('about_what') }}</p>

        <h2 class="legal-h2">
          {{ t('about_why_title') }}
        </h2>
        <p>{{ t('about_why') }}</p>

        <h2 class="legal-h2">
          {{ t('about_how_title') }}
        </h2>
        <p>{{ t('about_how') }}</p>

        <h2 class="legal-h2">
          {{ t('about_open_title') }}
        </h2>
        <p>
          {{ t('about_open') }}
          <a
            href="https://github.com/AlecInfo/umbra"
            target="_blank"
            rel="noopener"
            style="color:var(--accent)"
          >GitHub</a>.
        </p>

        <h2 class="legal-h2">
          {{ t('about_contact_title') }}
        </h2>
        <p>
          {{ t('about_contact') }}
          <a
            href="mailto:contact@umbravpn.io"
            style="color:var(--accent)"
          >contact@umbravpn.io</a>.
        </p>
      </div>
    </div>
    <LandingFooter />
  </div>
</template>

<style scoped>
.legal-title { font-family:var(--font-disp); font-size:32px; font-weight:800; margin-bottom:32px; }
.legal-h2 { font-family:var(--font-disp); font-size:18px; font-weight:700; color:var(--text); }
.legal-body { font-family:var(--font-body); font-size:14px; color:var(--muted); line-height:2; display:flex; flex-direction:column; gap:24px; }
</style>
