<script setup lang="ts">
import type { Node } from '~/stores/nodes'
import { categoryIcons } from '~/composables/useCategoryIcons'

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
