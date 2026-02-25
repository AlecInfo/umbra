<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const theme = useCookie('umbra-theme', { default: () => 'dark' })

useHead({
  htmlAttrs: { 'data-theme': theme },
})
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  background: var(--bg);
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-6);
}
</style>