<script setup lang="ts">
import type { NodeCategory } from '~/stores/nodes'
import { categoryIcons } from '~/composables/useCategoryIcons'

const props = defineProps<{ category: NodeCategory }>()

const labels: Record<NodeCategory, string> = {
  sbc:     'SBC',
  vps:     'VPS',
  router:  'Router',
  nas:     'NAS',
  desktop: 'Desktop',
  other:   'Other',
}
</script>

<template>
  <span class="cat-badge" :class="`cat-${props.category}`">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" v-html="categoryIcons[props.category]" />
    {{ labels[props.category] }}
  </span>
</template>

<style scoped>
.cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.cat-sbc     { background: rgba(79,255,176,.12);  color: var(--accent);  }
.cat-vps     { background: rgba(79,168,255,.15);  color: var(--pending); }
.cat-router  { background: rgba(255,183,79,.12);  color: var(--warning); }
.cat-nas     { background: rgba(123,110,246,.15); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2); color: var(--muted); border: 1px solid var(--border2); }
</style>
