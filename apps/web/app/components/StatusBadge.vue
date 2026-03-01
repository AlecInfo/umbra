<script setup lang="ts">
import type { NodeStatus } from '~/stores/nodes'

const props = defineProps<{ status: NodeStatus }>()

const labels: Record<NodeStatus, string> = {
  online:    'En ligne',
  offline:   'Hors ligne',
  warning:   'Alerte',
  pending:   'En attente',
  connected: 'Connecté',
}
</script>

<template>
  <div class="status-pill" :class="`s-${props.status}`">
    <span class="sdot" />
    <span>{{ labels[props.status] }}</span>
  </div>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.sdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.s-online    { background: rgba(79,255,176,.1);  color: var(--online);  }
.s-offline   { background: rgba(255,79,107,.1);  color: var(--offline); }
.s-warning   { background: rgba(255,183,79,.12); color: var(--warning); }
.s-pending   { background: rgba(79,168,255,.1);  color: var(--pending); }
.s-connected {
  background: rgba(79,255,176,.14);
  color: var(--accent);
  border: 1px solid rgba(79,255,176,.28);
}

.s-online   .sdot { background: var(--online);  animation: pon    2s   infinite; }
.s-warning  .sdot { background: var(--warning); animation: pwarn  1s   infinite; }
.s-pending  .sdot { background: var(--pending); animation: pblink 1.2s infinite; }
.s-offline  .sdot { background: var(--offline); }
.s-connected .sdot { background: var(--accent); animation: pon 1.5s infinite; }
</style>
