<template>
  <div class="chart-wrap" @mouseleave="onLeave">

    <!-- Header -->
    <div class="chart-header">
      <div class="chart-title">{{ title }}</div>
      <div class="chart-right">
        <span v-for="s in series" :key="s.key" class="legend-item">
          <span class="legend-dash" :style="`background:${s.color}`"/>
          {{ s.label }}
        </span>
        <span class="chart-values">
          <template v-for="(s, i) in series" :key="`val-${s.key}`">
            <span class="chart-val" :style="`color:${s.valueColor ?? s.color}`">
              {{ currentValues[s.key] }}{{ s.unit ?? '' }}
            </span>
            <span v-if="i < series.length - 1" class="chart-sep">·</span>
          </template>
        </span>
      </div>
    </div>

    <!-- SVG chart -->
    <div class="chart-area" ref="areaEl" @mousemove="onMove">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart-svg">
        <defs>
          <linearGradient
              v-for="s in series.filter(s => s.area)"
              :key="`g-${s.key}`"
              :id="`g-${uid}-${s.key}`"
              x1="0" y1="0" x2="0" y2="1"
          >
            <stop offset="0%" :stop-color="s.color" stop-opacity=".14"/>
            <stop offset="100%" :stop-color="s.color" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- 50% reference line for system chart -->
        <line
            v-if="showRefLine"
            x1="0" :y1="H/2" :x2="W" :y2="H/2"
            stroke="var(--border2)" stroke-width="1" stroke-dasharray="4,4"
        />

        <!-- Area fills -->
        <polygon
            v-for="s in series.filter(s => s.area)"
            :key="`area-${s.key}`"
            :points="areaPoints(s.key)"
            :fill="`url(#g-${uid}-${s.key})`"
        />

        <!-- Lines -->
        <polyline
            v-for="s in series"
            :key="`line-${s.key}`"
            :points="linePoints(s.key)"
            fill="none"
            :stroke="s.color"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :opacity="s.opacity ?? 0.9"
        />

        <!-- Crosshair -->
        <line
            v-if="hover.visible"
            :x1="hover.x" y1="0" :x2="hover.x" :y2="H"
            stroke="var(--border2)" stroke-width="1" stroke-dasharray="3,3"
        />
        <circle
            v-for="s in series"
            v-show="hover.visible"
            :key="`dot-${s.key}`"
            :cx="hover.x"
            :cy="hover.dots[s.key] ?? 0"
            r="3"
            :fill="s.color"
        />
      </svg>

      <!-- Tooltip -->
      <div v-if="hover.visible" class="chart-tooltip" :style="`left:${tooltipX}px`">
        <div class="tooltip-time">{{ hover.time }}</div>
        <div v-for="s in series" :key="s.key" class="tooltip-row">
          <span class="tooltip-dash" :style="`background:${s.color}`"/>
          <span class="tooltip-lbl">{{ s.label }}</span>
          <span class="tooltip-val" :style="`color:${s.color}`">{{ hover.values[s.key] }}{{ s.unit ?? '' }}</span>
        </div>
      </div>
    </div>

    <!-- X axis -->
    <div class="chart-axis">
      <span v-for="l in axisLabels" :key="l">{{ l }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
export interface DataPoint {
  ts: number

  [key: string]: number | undefined
}

export interface ChartSeries {
  key: string
  label: string
  color: string
  area?: boolean
  unit?: string
  opacity?: number
  step?: boolean
  valueColor?: string
  decimals?:  number
}

const props = defineProps<{
  title: string
  data: DataPoint[]
  series: ChartSeries[]
  showRefLine?: boolean
}>()

const uid = Math.random().toString(36).slice(2, 7)
const W = 600
const H = 72
const areaEl = ref<HTMLDivElement>()

function getRange(key: string): [number, number] {
  const vals = props.data.map(d => d[key] ?? 0)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return [min, max === min ? max + 1 : max]
}

function toY(val: number, key: string): number {
  const [min, max] = getRange(key)
  return H - ((val - min) / (max - min)) * (H - 4) - 2
}

function toX(i: number): number {
  return (i / Math.max(props.data.length - 1, 1)) * W
}

function linePoints(key: string): string {
  const s = props.series.find(s => s.key === key)
  if (!props.data.length) return ''
  if (s?.step) {
    return props.data.flatMap((d, i) => {
      const x = toX(i)
      const y = toY(d[key] ?? 0, key)
      if (i === 0) return [`${x},${y}`]
      return [`${toX(i - 1)},${y}`, `${x},${y}`]
    }).join(' ')
  }
  return props.data.map((d, i) => `${toX(i)},${toY(d[key] ?? 0, key)}`).join(' ')
}

function areaPoints(key: string): string {
  if (!props.data.length) return ''
  const top = linePoints(key)
  return `0,${H} ${top} ${W},${H}`
}

const axisLabels = computed(() => {
  if (!props.data.length) return ['–', '–', '–', '–', 'maintenant']
  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
  const d = props.data
  return [
    fmt(d[0].ts),
    fmt(d[Math.floor(d.length * 0.25)].ts),
    fmt(d[Math.floor(d.length * 0.5)].ts),
    fmt(d[Math.floor(d.length * 0.75)].ts),
    'maintenant',
  ]
})

const currentValues = computed(() => {
  if (!props.data.length) return {}
  const last = props.data[props.data.length - 1]
  const result: Record<string, string> = {}
  props.series.forEach(s => {
    result[s.key] = Math.round(last[s.key] ?? 0).toString()
  })
  return result
})

const hover = reactive({
  visible: false,
  x: 0,
  time: '',
  values: {} as Record<string, string>,
  dots: {} as Record<string, number>,
})

const tooltipX = computed(() => {
  const rect = areaEl.value?.getBoundingClientRect()
  if (!rect) return hover.x
  const px = (hover.x / W) * rect.width
  return px > rect.width - 145 ? px - 148 : px + 10
})

function onMove(e: MouseEvent) {
  const rect = areaEl.value?.getBoundingClientRect()
  if (!rect || !props.data.length) return
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const idx = Math.round(pct * (props.data.length - 1))
  const d = props.data[idx]
  hover.visible = true
  hover.x = pct * W
  hover.time = new Date(d.ts).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
  props.series.forEach(s => {
    const val = d[s.key] ?? 0
    hover.values[s.key] = Number(val).toFixed(s.decimals ?? 1)
    hover.dots[s.key] = toY(val, s.key)
  })
}

function onLeave() {
  hover.visible = false
}
</script>

<style scoped>
.chart-wrap {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px 0;
  position: relative;
  user-select: none;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .1em;
}

.chart-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  color: var(--muted);
}

.legend-dash {
  display: inline-block;
  width: 16px;
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

.chart-values {
  display: flex;
  gap: 8px;
}

.chart-sep {
  font-size: 9px;
  color: var(--muted);
}

.chart-val {
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.chart-current {
  font-size: 11px;
  font-weight: 600;
}

.chart-area {
  height: 72px;
  position: relative;
  cursor: crosshair;
}

.chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  padding: 4px 0 8px;
  font-size: 8px;
  color: var(--muted);
}

.chart-tooltip {
  position: absolute;
  top: 4px;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 6px;
  padding: 8px 10px;
  pointer-events: none;
  min-width: 130px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .4);
  z-index: 10;
  font-size: 10px;
}

.tooltip-time {
  font-size: 9px;
  color: var(--muted);
  margin-bottom: 5px;
  font-family: var(--font-mono);
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.tooltip-row:last-child {
  margin-bottom: 0;
}

.tooltip-dash {
  display: inline-block;
  width: 12px;
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

.tooltip-lbl {
  flex: 1;
  color: var(--muted);
}

.tooltip-val {
  font-weight: 600;
  font-family: var(--font-mono);
}
</style>