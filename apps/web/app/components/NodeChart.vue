<script setup lang="ts">
interface SeriesConfig {
  name:  string
  color?: string
  fmt?:  (v: number) => string
}

const props = withDefaults(defineProps<{
  title:      string
  data:       Record<string, number>[]
  categories: Record<string, SeriesConfig>
  height:     number
  chartType?: 'area' | 'line'
  valColor?:  string  // override color for all values; default = series color
  xFmt?:      (ts: number) => string  // x-axis + tooltip title formatter
  curveType?: string  // e.g. 'step', 'monotoneX', 'basis', 'linear'...
}>(), {
  chartType: 'area',
})

function defaultFmt(ts: number): string {
  const d = new Date(ts)
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

const activeXFmt = computed(() => props.xFmt ?? defaultFmt)

// unovis uses array index as x — map index → ts for axis tick labels
const xTickFmt = computed(() => {
  const data = props.data
  const fmt  = activeXFmt.value
  return (idx: number) => {
    const point = data[Math.round(idx)]
    return point ? fmt(point.ts ?? 0) : ''
  }
})

// Tooltip receives the full data record, so ts is directly available
const tooltipTitleFmt = computed(() => (data: Record<string, number>) => activeXFmt.value(data.ts ?? 0))

const lastPoint = computed(() => props.data[props.data.length - 1] ?? {})

// Strip our extra keys before passing to nuxt-charts
const chartCategories = computed(() =>
  Object.fromEntries(
    Object.entries(props.categories).map(([k, v]) => [k, { name: v.name, color: v.color }])
  )
)
</script>

<template>
  <div class="node-chart">
    <div class="nc-header">
      <span class="nc-title">{{ title }}</span>
      <div class="nc-legend">

        <!-- All names (with colored line) first -->
        <span v-for="(cat, key) in categories" :key="`n-${String(key)}`" class="nc-legend-item">
          <span class="nc-legend-line" :style="`background: ${cat.color ?? 'var(--muted)'}`" />
          <span class="nc-legend-name">{{ cat.name }}</span>
        </span>

        <!-- All values, each colored with its series color, separated by · -->
        <template v-for="(cat, key, idx) in categories" :key="`v-${String(key)}`">
          <span v-if="cat.fmt && idx > 0" class="nc-sep">·</span>
          <span
            v-if="cat.fmt"
            class="nc-item-val"
            :style="`color: ${valColor ?? cat.color ?? 'var(--text)'}`"
          >{{ lastPoint[String(key)] != null ? cat.fmt(lastPoint[String(key)]!) : '—' }}</span>
        </template>

      </div>
    </div>

    <AreaChart
      v-if="chartType === 'area'"
      :data="data"
      :categories="chartCategories"
      :height="height"
      :x-formatter="xTickFmt"
      :tooltip-title-formatter="tooltipTitleFmt"
      :x-num-ticks="5"
      :hide-legend="true"
      :hide-y-axis="true"
      :curve-type="curveType"
    />
    <LineChart
      v-else
      :data="data"
      :categories="chartCategories"
      :height="height"
      :x-formatter="xTickFmt"
      :tooltip-title-formatter="tooltipTitleFmt"
      :x-num-ticks="5"
      :hide-legend="true"
      :hide-y-axis="true"
      :curve-type="curveType"
    />
  </div>
</template>
