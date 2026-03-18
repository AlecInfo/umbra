<script setup lang="ts">
useHead({ title: 'UMBRA — Terms of Service' })
useSeoMeta({
  description: 'UMBRA terms of service. Conditions for using our open-source self-hosted VPN manager.'
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
        Terms of Service
      </h1>
      <div class="legal-body">
        <p>Last updated: March 2026</p>
        <h2 class="legal-h2">
          1. Service
        </h2>
        <p>UMBRA is an open-source, self-hosted VPN management tool. The software is provided "as is" under the Apache 2.0 license.</p>
        <h2 class="legal-h2">
          2. Waitlist
        </h2>
        <p>By joining the waitlist, you agree to receive occasional emails about UMBRA's launch and updates. You can unsubscribe at any time.</p>
        <h2 class="legal-h2">
          3. Disclaimer
        </h2>
        <p>UMBRA is in active development. Features, pricing, and availability are subject to change. We make no guarantees about uptime or availability of any future service.</p>
        <h2 class="legal-h2">
          4. Contact
        </h2>
        <p>
          For any questions, contact us at
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
