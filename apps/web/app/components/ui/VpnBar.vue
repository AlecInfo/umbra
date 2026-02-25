<template>
  <div class="vpn-bar">
    <div class="vpn-dot" />
    <div class="vpn-info">
      <div class="vpn-name">{{ node.name }} — {{ node.location }}</div>
      <div class="vpn-detail">{{ node.ip }} · WireGuard · umbra0</div>
    </div>
    <div class="vpn-stats">
      <div class="vstat">
        <div class="vstat-val">{{ node.latency }}ms</div>
        <div class="vstat-lbl">Latence</div>
      </div>
      <div class="vstat">
        <div class="vstat-val">↑ {{ upload }}</div>
        <div class="vstat-lbl">Upload</div>
      </div>
      <div class="vstat">
        <div class="vstat-val">↓ {{ download }}</div>
        <div class="vstat-lbl">Download</div>
      </div>
    </div>
    <button class="btn-cut" @click="emit('cut', node)">Déconnecter</button>
  </div>
</template>

<script setup lang="ts">
import type { Node } from '@umbra/types'

const props = withDefaults(defineProps<{
  node:      Node
  upload?:   string
  download?: string
}>(), {
  upload:   '0 B/s',
  download: '0 B/s',
})

const emit = defineEmits<{ cut: [node: Node] }>()
</script>

<style scoped>
.vpn-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(79,255,176,.05);
  border: 1px solid rgba(79,255,176,.18);
  border-radius: var(--r);
  padding: 9px 14px;
  font-size: 11px;
}

.vpn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: vpnp 2s infinite;
}

.vpn-info { flex: 1; }
.vpn-name { color: var(--accent); font-weight: 500; }
.vpn-detail { color: var(--muted); font-size: 10px; margin-top: 1px; }

.vpn-stats {
  display: flex;
  gap: 20px;
}

.vstat-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.vstat-lbl {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .07em;
}

.vstat {
  text-align: right;
}

.btn-cut {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  background: rgba(255,79,107,.1);
  border: 1px solid rgba(255,79,107,.3);
  color: var(--offline);
  transition: all .15s;
  white-space: nowrap;
}

.btn-cut:hover {
  background: rgba(255,79,107,.18);
}

@keyframes vpnp {
  0%,100% { box-shadow: 0 0 0 0   rgba(79,255,176,.4); }
  50%     { box-shadow: 0 0 0 5px rgba(79,255,176,0);  }
}
</style>