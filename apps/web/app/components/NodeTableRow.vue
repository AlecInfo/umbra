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
        <UIcon :name="categoryIcons[node.category]" style="width:15px;height:15px" />
      </div>
      <div>
        <div class="nname">{{ node.name }}</div>
        <div class="nid">
          {{ node.ip }}
          <span v-if="node.status === 'warning'" class="warn-hint"><UIcon name="i-lucide-triangle-alert" style="width:9px;height:9px" /> CPU {{ node.cpu }}%</span>
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
        <UIcon v-if="node.status === 'connected'" name="i-lucide-square" style="width:8px;height:8px" />
        <UIcon v-else name="i-lucide-play" style="width:8px;height:8px" />
        {{ node.status === 'connected' ? 'Couper' : 'Connecter' }}
      </button>
    </div>

  </div>
</template>
