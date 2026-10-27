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
    <UIcon :name="categoryIcons[props.category]" style="width:13px;height:13px" />
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

.cat-sbc     { background: color-mix(in srgb, var(--accent) 12%, transparent);  color: var(--accent);  }
.cat-vps     { background: color-mix(in srgb, var(--pending) 15%, transparent);  color: var(--pending); }
.cat-router  { background: color-mix(in srgb, var(--warning) 12%, transparent);  color: var(--warning); }
.cat-nas     { background: color-mix(in srgb, var(--accent2) 15%, transparent); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2); color: var(--muted); border: 1px solid var(--border2); }
</style>
