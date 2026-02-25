<template>
  <div class="node-row" :class="rowClass" @click="emit('click', node)">

    <!-- Noeud -->
    <div class="nc">
      <div class="nicon" :class="`cat-${node.category}`" :style="iconStyle">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" v-html="categoryIcon" />
      </div>
      <div>
        <div class="nname">{{ node.name }}</div>
        <div class="nid">
          {{ node.ip }}
          <span v-if="node.status === 'warning'" class="warn-hint">⚠ CPU {{ node.cpu }}%</span>
        </div>
      </div>
    </div>

    <!-- Localisation -->
    <span class="cell-m">{{ node.location }}</span>

    <!-- Statut -->
    <span><StatusPill :status="node.status" /></span>

    <!-- Latence -->
    <span class="cell-m" :style="latencyStyle">
      {{ node.latency !== null ? `${node.latency}ms` : '—' }}
    </span>

    <!-- CPU -->
    <span class="cell-m" :style="cpuStyle">
      {{ node.cpu !== null ? `${node.cpu}%` : '—' }}
    </span>

    <!-- Action -->
    <div class="cell-action">
      <button
          class="conn-btn"
          :class="{ cut: node.status === 'connected' }"
          :disabled="node.status === 'offline'"
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

<script setup lang="ts">
import type { Node } from '@umbra/types'

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

const iconStyle = computed(() => {
  if (props.node.status === 'warning') {
    return 'background: rgba(255,183,79,.15); color: var(--warning)'
  }
  return ''
})

const latencyStyle = computed(() =>
    props.node.status === 'connected' ? 'color: var(--accent)' : ''
)

const cpuStyle = computed(() => {
  if (props.node.cpu === null) return 'opacity: .3'
  if (props.node.cpu > 80)    return 'color: var(--warning)'
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

const categoryIcon = computed(() => categoryIcons[props.node.category])

function onAction() {
  if (props.node.status === 'connected') emit('cut', props.node)
  else emit('connect', props.node)
}
</script>

<style scoped>
.node-row {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1fr 0.9fr 0.9fr 88px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  transition: background .1s;
  cursor: pointer;
}

.node-row:last-child  { border-bottom: none; }
.node-row:hover       { background: var(--surface2); }

.r-conn {
  background: rgba(79,255,176,.04);
  border-left: 2px solid var(--accent);
  padding-left: 14px;
}
.r-warn {
  background: rgba(255,183,79,.04);
  border-left: 2px solid var(--warning);
  padding-left: 14px;
}
.r-off { opacity: .6; }

.nc {
  display: flex;
  align-items: center;
  gap: 9px;
}

.nicon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cat-sbc     { background: rgba(79,255,176,.12);  color: var(--accent);  }
.cat-vps     { background: rgba(79,168,255,.15);  color: #4fa8ff;        }
.cat-router  { background: rgba(255,183,79,.12);  color: var(--warning); }
.cat-nas     { background: rgba(123,110,246,.15); color: var(--accent2); }
.cat-desktop { background: rgba(200,200,220,.1);  color: var(--muted);   }
.cat-other   { background: var(--surface2);       color: var(--muted);   }

.nname { font-size: 12px; font-weight: 500; color: var(--text); }
.nid   { font-size: 9px;  color: var(--muted); margin-top: 1px; }

.warn-hint { color: var(--warning); margin-left: 4px; }

.cell-m { font-size: 11px; color: var(--muted); }

.cell-action {
  display: flex;
  justify-content: flex-end;
}

.conn-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  border: 1px solid var(--border2);
  background: none;
  color: var(--muted);
  transition: all .15s;
  white-space: nowrap;
}

.conn-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(79,255,176,.06);
}

.conn-btn.cut {
  border-color: rgba(255,79,107,.4);
  color: var(--offline);
}

.conn-btn:disabled {
  opacity: .3;
  cursor: not-allowed;
}
</style>