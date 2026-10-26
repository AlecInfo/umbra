<script setup lang="ts">
// A phone paints its status bar and browser chrome with this colour. It has
// to follow the app's own theme toggle, which is a class on <html>, not the
// OS setting a media query would read.
const colorMode = useColorMode()
useHead({
  meta: [{ name: 'theme-color', content: () => (colorMode.value === 'light' ? '#f4f4f6' : '#0a0a0b') }],
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
