<script setup lang="ts">
import type { Node } from '~/stores/nodes'

const props = defineProps<{ node: Node }>()
const emit  = defineEmits<{
  click:   [node: Node]
  connect: [node: Node]
  cut:     [node: Node]
}>()

const rowClass = computed(() => ({
  'r-conn': props.node.status === 'connected',
  'r-warn': props.node.status === 'warning',
  'r-off':  props.node.status === 'offline',
}))

const latencyStyle = computed(() =>
  props.node.status === 'connected' ? 'color: var(--accent)' : ''
)

const cpuStyle = computed(() => {
  if (props.node.cpu === null) return 'opacity: .3'
  if (props.node.cpu > 80)    return 'color: var(--warning)'
  return ''
})

const iconStyle = computed(() => {
  if (props.node.status === 'warning')
    return 'background: rgba(255,183,79,.15); color: var(--warning)'
  return ''
})

const categoryIcons: Record<string, string> = {
  sbc:     `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="0" x2="4" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="0" x2="8" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="12" y1="0" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="14" x2="4" y2="16" stroke="currentColor" stroke-width="1.2"/>`,
  vps:     `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  router:  `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="4" y1="6" x2="4" y2="4" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="4" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="9.5" r="1" fill="currentColor"/><circle cx="9" cy="9.5" r="1" fill="currentColor"/>`,
  nas:     `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/><circle cx="4.5" cy="9" r=".8" fill="currentColor"/>`,
  desktop: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/><line x1="5" y1="15" x2="11" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  other:   `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11" r=".8" fill="currentColor" stroke="none"/>`,
}

function onAction() {
  if (props.node.status === 'connected') emit('cut', props.node)
  else emit('connect', props.node)
}
</script>

<template>
  <div class="node-row" :class="rowClass" @click="emit('click', node)">

    <div class="nc">
      <div class="nicon" :class="`cat-${node.category}`" :style="iconStyle">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" v-html="categoryIcons[node.category]" />
      </div>
      <div>
        <div class="nname">{{ node.name }}</div>
        <div class="nid">
          {{ node.ip }}
          <span v-if="node.status === 'warning'" class="warn-hint">⚠ CPU {{ node.cpu }}%</span>
        </div>
      </div>
    </div>

    <span class="cell-m">{{ node.location }}</span>

    <span><StatusBadge :status="node.status" /></span>

    <span class="cell-m" :style="latencyStyle">
      {{ node.latency !== null ? `${node.latency}ms` : '—' }}
    </span>

    <span class="cell-m" :style="cpuStyle">
      {{ node.cpu !== null ? `${node.cpu}%` : '—' }}
    </span>

    <div class="cell-action">
      <button
        class="conn-btn"
        :class="{ cut: node.status === 'connected' }"
        :disabled="node.status === 'offline' || node.status === 'pending'"
        @click.stop="onAction"
      >
        <svg v-if="node.status === 'connected'" width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <rect width="8" height="8" rx="1"/>
        </svg>
        <svg v-else width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <path d="M2 1l5 3-5 3V1z"/>
        </svg>
        {{ node.status === 'connected' ? 'Couper' : 'Connecter' }}
      </button>
    </div>

  </div>
</template>
