<script setup lang="ts">
import type { Lang } from '~/composables/useT'

const { lang, setLang } = useT()

const langs: { value: Lang; label: string }[] = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
]
</script>

<template>
  <div class="lang-toggle">
    <button
      v-for="l in langs"
      :key="l.value"
      class="lang-btn"
      :class="{ active: lang === l.value }"
      @click="setLang(l.value)"
    >
      {{ l.label }}
    </button>
  </div>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
}
.lang-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: .04em;
  transition: background .15s, color .15s;
}
.lang-btn:hover { color: var(--text); }
.lang-btn.active {
  background: var(--surface2);
  color: var(--text);
}
</style>
