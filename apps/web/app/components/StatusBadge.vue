<script setup lang="ts">
import type { NodeStatus } from '~/stores/nodes'

const props = defineProps<{ status: NodeStatus }>()
const { t } = useT()
</script>

<template>
  <div class="status-pill" :class="`s-${props.status}`">
    <span class="sdot" />
    <span>{{ t(`status_${props.status}`) }}</span>
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
  position: relative;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.s-online    { background: color-mix(in srgb, var(--accent) 10%, transparent);  color: var(--online);  }
.s-offline   { background: color-mix(in srgb, var(--offline) 10%, transparent);  color: var(--offline); }
.s-warning   { background: color-mix(in srgb, var(--warning) 12%, transparent); color: var(--warning); }
.s-pending   { background: color-mix(in srgb, var(--pending) 10%, transparent);  color: var(--pending); }
.s-connected {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
}

/* Motion is for what needs attention. Online is the normal state: a still
   dot — sixteen pulsing ones used to say "look here" about nothing. */
.s-online   .sdot { background: var(--online); }
.s-warning  .sdot { background: var(--warning); animation: pwarn  1s   infinite; }
.s-pending  .sdot { background: var(--pending); animation: pblink 1.2s infinite; }
.s-offline  .sdot { background: var(--offline); }
.s-connected .sdot { background: var(--accent); }
.s-connected .sdot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: ping 2s var(--ease-out) infinite;
}
</style>
