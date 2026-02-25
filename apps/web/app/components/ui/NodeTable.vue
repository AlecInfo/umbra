<template>
  <div class="node-table">

    <!-- Header -->
    <div class="t-head">
      <span>Noeud</span>
      <span>Localisation</span>
      <span>Statut</span>
      <span>Latence</span>
      <span>CPU</span>
      <span></span>
    </div>

    <!-- Rows -->
    <NodeRow
        v-for="node in nodes"
        :key="node.id"
        :node="node"
        @click="emit('clickNode', node)"
        @connect="emit('connect', node)"
        @cut="emit('cut', node)"
    />

    <!-- Empty state -->
    <div v-if="nodes.length === 0" class="empty">
      Aucun noeud enregistré
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Node } from '@umbra/types'

defineProps<{ nodes: Node[] }>()

const emit = defineEmits<{
  clickNode: [node: Node]
  connect:   [node: Node]
  cut:       [node: Node]
}>()
</script>

<style scoped>
.node-table {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}

.t-head {
  display: grid;
  grid-template-columns: 2fr 1.1fr 1fr 0.9fr 0.9fr 88px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 11px;
  color: var(--muted);
}
</style>