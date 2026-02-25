<template>
  <div class="stat-card">
    <div class="stat-lbl">{{ label }}</div>
    <div class="stat-val">
      <span :style="valueStyle">{{ value }}</span>
      <span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
    </div>
    <div v-if="sub" class="stat-sub">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label:  string
  value:  string | number
  suffix?: string
  sub?:   string
  color?: 'accent' | 'warning' | 'offline' | 'default'
}>()

const valueStyle = computed(() => {
  const map: Record<string, string> = {
    accent:  'color: var(--accent)',
    warning: 'color: var(--warning)',
    offline: 'color: var(--offline)',
    default: 'color: var(--text)',
  }
  return map[props.color ?? 'accent']
})
</script>

<style scoped>
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px 16px;
}

.stat-lbl {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-bottom: 7px;
}

.stat-val {
  font-family: var(--font-disp);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.stat-suffix {
  font-size: 13px;
  color: var(--muted);
  margin-left: 2px;
}

.stat-sub {
  font-size: 10px;
  color: var(--muted);
  margin-top: 4px;
}
</style>