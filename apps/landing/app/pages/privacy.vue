<script setup lang="ts">
useHead({ title: 'UMBRA — Privacy Policy' })
</script>

<template>
  <div>
    <LandingNav />
    <div
      class="wrap"
      style="padding-top:calc(var(--nav-h) + 48px);padding-bottom:96px;max-width:720px"
    >
      <h1 class="legal-title">
        Privacy Policy
      </h1>
      <div class="legal-body">
        <p>Last updated: March 2026</p>
        <h2 class="legal-h2">
          1. Data we collect
        </h2>
        <p>When you join the waitlist, we collect your email address. That's it. We do not use cookies for tracking, and we do not share your data with third parties.</p>
        <h2 class="legal-h2">
          2. How we use it
        </h2>
        <p>
          Your email is used solely to notify you when UMBRA launches. You can unsubscribe at any time by contacting us at
          <a
            href="mailto:contact@umbravpn.io"
            style="color:var(--accent)"
          >contact@umbravpn.io</a>.
        </p>
        <h2 class="legal-h2">
          3. Self-hosted product
        </h2>
        <p>UMBRA is a self-hosted VPN manager. When you use UMBRA, your data flows only through infrastructure you control. We have no access to your traffic, logs, or network activity.</p>
        <h2 class="legal-h2">
          4. Contact
        </h2>
        <p>
          For any questions regarding this policy, contact us at
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
