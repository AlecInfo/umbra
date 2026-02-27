bash
<template>
  <div class="map-card">

    <div class="map-header">
      <div class="map-title">Carte des noeuds</div>
      <div class="map-hint">Cliquer sur un noeud pour se connecter</div>
    </div>

    <div class="map-body" ref="mapBody">

      <!-- World SVG -->
      <svg class="world-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
        <!-- NORTH AMERICA -->
        <path class="land-path" d="M90,80 L100,70 L120,65 L145,60 L160,55 L175,52 L185,58 L190,65 L185,75 L178,80 L168,78 L162,82 L155,92 L148,105 L145,118 L138,125 L130,130 L125,140 L118,150 L112,158 L108,165 L104,172 L100,178 L95,185 L92,195 L88,205 L84,215 L82,225 L84,235 L88,242 L92,248 L98,252 L105,255 L112,258 L118,262 L122,268 L118,272 L110,275 L102,272 L94,268 L86,265 L80,268 L76,275 L74,282 L72,275 L68,268 L64,262 L60,258 L56,252 L54,245 L52,238 L50,230 L52,222 L55,215 L58,208 L56,200 L52,195 L48,188 L46,180 L48,172 L52,165 L56,158 L58,150 L55,142 L50,135 L46,128 L44,120 L46,112 L50,105 L55,98 L60,92 L66,86 L74,82 L82,80 L90,80 Z"/>
        <path class="land-path" d="M155,20 L170,15 L185,18 L195,25 L195,35 L188,42 L178,45 L168,42 L158,35 L152,28 L155,20 Z"/>
        <path class="land-path" d="M122,268 L118,272 L114,278 L110,284 L108,290 L110,296 L114,300 L118,295 L122,288 L124,280 L122,268 Z"/>
        <!-- SOUTH AMERICA -->
        <path class="land-path" d="M145,285 L152,278 L160,272 L168,268 L175,270 L180,276 L182,285 L180,295 L176,305 L172,315 L168,328 L164,340 L160,355 L156,368 L152,380 L148,390 L145,398 L142,405 L140,412 L138,405 L135,395 L132,382 L130,368 L128,355 L126,342 L124,328 L122,315 L120,302 L118,290 L120,280 L126,274 L132,270 L138,268 L145,285 Z"/>
        <!-- EUROPE -->
        <path class="land-path" d="M440,60 L448,55 L456,52 L464,55 L470,62 L475,70 L472,78 L466,82 L458,85 L450,88 L443,85 L436,80 L432,72 L436,64 L440,60 Z M448,88 L455,90 L462,95 L468,102 L465,110 L458,114 L450,112 L443,108 L440,100 L443,93 L448,88 Z M460,110 L468,108 L476,112 L482,118 L486,125 L484,132 L478,136 L470,138 L462,135 L456,128 L455,120 L458,114 L460,110 Z M470,60 L480,55 L492,52 L504,55 L512,62 L515,70 L510,78 L500,82 L490,80 L480,76 L472,70 L470,60 Z M500,82 L510,85 L518,92 L520,100 L516,108 L508,112 L498,110 L490,104 L488,96 L492,89 L500,82 Z M490,110 L500,112 L510,116 L518,122 L522,130 L520,138 L512,142 L502,140 L494,135 L490,127 L488,118 L490,110 Z"/>
        <!-- SCANDINAVIA -->
        <path class="land-path" d="M480,38 L488,32 L496,30 L502,35 L504,44 L500,52 L492,56 L484,52 L480,44 L480,38 Z M504,38 L512,32 L518,35 L520,44 L516,52 L508,54 L504,46 L504,38 Z"/>
        <!-- UK -->
        <path class="land-path" d="M432,72 L438,68 L444,70 L445,78 L440,83 L434,80 L432,72 Z M425,75 L430,72 L432,78 L428,83 L423,80 L425,75 Z"/>
        <!-- ICELAND -->
        <path class="land-path" d="M408,45 L416,40 L424,42 L427,50 L422,56 L413,56 L408,50 L408,45 Z"/>
        <!-- AFRICA -->
        <path class="land-path" d="M450,148 L460,142 L472,140 L484,142 L494,148 L502,156 L508,165 L512,175 L514,185 L512,196 L508,208 L504,220 L500,232 L496,245 L492,258 L488,270 L482,280 L476,288 L468,294 L460,296 L452,292 L445,284 L440,274 L436,262 L432,250 L430,238 L428,226 L428,214 L430,202 L432,190 L434,178 L436,166 L440,155 L445,148 L450,148 Z"/>
        <!-- MIDDLE EAST -->
        <path class="land-path" d="M520,130 L532,125 L545,122 L558,125 L565,133 L568,143 L564,152 L555,158 L544,160 L532,157 L522,150 L516,140 L520,130 Z"/>
        <!-- INDIA -->
        <path class="land-path" d="M580,130 L592,125 L602,128 L608,138 L610,150 L606,162 L598,172 L590,178 L582,175 L576,165 L574,152 L576,140 L580,130 Z"/>
        <!-- RUSSIA -->
        <path class="land-path" d="M480,20 L520,12 L570,8 L620,10 L665,14 L705,18 L740,22 L768,28 L788,35 L800,44 L798,55 L785,62 L768,65 L750,65 L730,62 L710,62 L690,65 L672,70 L655,75 L638,78 L620,80 L600,80 L580,78 L560,75 L542,72 L525,72 L510,75 L496,80 L484,82 L480,75 L476,65 L478,52 L480,40 L480,20 Z"/>
        <!-- CHINA -->
        <path class="land-path" d="M600,80 L625,82 L650,85 L675,90 L698,98 L715,108 L725,120 L720,132 L708,140 L692,145 L675,148 L658,148 L640,145 L622,140 L606,133 L595,122 L590,110 L595,96 L600,80 Z"/>
        <!-- SE ASIA -->
        <path class="land-path" d="M680,145 L695,148 L710,152 L720,160 L718,170 L708,175 L695,172 L682,165 L675,155 L678,147 L680,145 Z M710,155 L722,158 L730,165 L728,174 L718,178 L708,175 L710,165 L710,155 Z"/>
        <!-- JAPAN -->
        <path class="land-path" d="M770,80 L778,75 L785,78 L788,86 L784,93 L776,95 L770,90 L770,80 Z M780,94 L788,90 L795,93 L796,101 L790,107 L782,106 L778,99 L780,94 Z"/>
        <!-- AUSTRALIA -->
        <path class="land-path" d="M705,285 L722,278 L740,275 L758,276 L774,280 L788,288 L796,300 L798,314 L794,328 L785,338 L772,345 L758,348 L742,346 L728,340 L716,330 L708,318 L703,305 L703,292 L705,285 Z"/>
        <!-- NEW ZEALAND -->
        <path class="land-path" d="M828,320 L834,315 L838,320 L836,328 L830,330 L826,325 L828,320 Z"/>
      </svg>

      <!-- Node dots -->
      <div
          v-for="node in nodes"
          :key="node.id"
          class="map-node-wrap"
          :style="`left:${node.x}%;top:${node.y}%`"
      >
        <button
            class="map-node-btn"
            @mouseenter="showTip(node, $event)"
            @mousemove="moveTip($event)"
            @mouseleave="hideTip"
            @click="onNodeClick(node)"
        >
          <div class="map-dot-ring" :class="`dot-${node.status}-ring`">
            <div class="map-dot" :class="`dot-${node.status}`" />
          </div>
        </button>
      </div>

      <!-- Tooltip -->
      <div
          class="map-tip"
          :class="{ visible: tip.visible }"
          :style="`left:${tip.x}px;top:${tip.y}px`"
      >
        <div class="map-tip-name">
          <div class="tip-cat-icon" :class="`cat-${tip.node?.category}`">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" v-html="categoryIcon(tip.node?.category)" />
          </div>
          <span>{{ tip.node?.name }}</span>
          <span class="tip-status-pill" :class="`pill-${tip.node?.status}`">
            {{ statusLabel(tip.node?.status) }}
          </span>
        </div>
        <div class="map-tip-row"><span>Localisation</span><span class="map-tip-val">{{ tip.node?.location }}</span></div>
        <div class="map-tip-row" v-if="tip.node?.latency"><span>Latence</span><span class="map-tip-val">{{ tip.node.latency }}ms</span></div>
        <div class="map-tip-row" v-if="tip.node?.cpu"><span>CPU</span><span class="map-tip-val">{{ tip.node.cpu }}%</span></div>
        <div class="map-tip-hint" v-if="tip.node?.status !== 'offline'">Cliquer pour se connecter</div>
        <div class="map-tip-offline" v-else>Noeud hors ligne</div>
      </div>

    </div>

    <!-- Legend -->
    <div class="map-legend">
      <div class="map-legend-item">
        <div class="legend-dot" style="background:var(--online)" />
        En ligne ({{ countByStatus('online') }})
      </div>
      <div class="map-legend-item">
        <div class="legend-dot" style="background:var(--warning)" />
        Alerte ({{ countByStatus('warning') }})
      </div>
      <div class="map-legend-item">
        <div class="legend-dot" style="background:var(--offline)" />
        Hors ligne ({{ countByStatus('offline') }})
      </div>
      <div class="map-legend-item" v-if="connectedNode">
        <div class="legend-dot connected-dot" />
        Connecté
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
interface MapNode {
  id:       string
  name:     string
  category: string
  location: string
  status:   'online' | 'offline' | 'warning' | 'connected'
  x:        number  // % left
  y:        number  // % top
  latency?: number
  cpu?:     number
}

const props = defineProps<{
  nodes: MapNode[]
}>()

const emit = defineEmits<{
  connect: [node: MapNode]
}>()

const mapBody = ref<HTMLDivElement>()

// Tooltip state
const tip = reactive({
  visible: false,
  x: 0,
  y: 0,
  node: null as MapNode | null,
})

function showTip(node: MapNode, e: MouseEvent) {
  tip.node    = node
  tip.visible = true
  updateTipPos(e)
}

function moveTip(e: MouseEvent) {
  updateTipPos(e)
}

function hideTip() {
  tip.visible = false
}

function updateTipPos(e: MouseEvent) {
  const rect = mapBody.value?.getBoundingClientRect()
  if (!rect) return
  const x = e.clientX - rect.left + 14
  const y = e.clientY - rect.top - 10
  tip.x = x + 200 > rect.width ? x - 224 : x
  tip.y = Math.max(4, y)
}

function onNodeClick(node: MapNode) {
  if (node.status !== 'offline') emit('connect', node)
}

function countByStatus(s: string) {
  return props.nodes.filter(n => n.status === s).length
}

const connectedNode = computed(() => props.nodes.find(n => n.status === 'connected'))

function statusLabel(s?: string) {
  return { online: 'en ligne', offline: 'hors ligne', warning: 'alerte', connected: 'connecté' }[s ?? ''] ?? s
}

const categoryIcons: Record<string, string> = {
  sbc:     `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/>`,
  vps:     `<rect x="1" y="3" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><rect x="1" y="9" width="14" height="4" rx="1.2" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/>`,
  router:  `<rect x="1" y="6" width="14" height="6" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="6" x2="8" y2="2" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="9.5" r="1" fill="currentColor"/>`,
  nas:     `<rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="2" y="7" width="12" height="4" rx="1" stroke="currentColor" stroke-width="1.3"/><circle cx="4.5" cy="4" r=".8" fill="currentColor"/>`,
  desktop: `<rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.3"/>`,
  other:   `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.3"/>`,
}

function categoryIcon(cat?: string) {
  return categoryIcons[cat ?? 'other'] ?? categoryIcons.other
}
</script>

<style scoped>
.map-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
  margin-bottom: 20px;
}

.map-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.map-title { font-size: 12px; font-weight: 500; color: var(--text); }
.map-hint  { font-size: 10px; color: var(--muted); }

/* Map body */
.map-body {
  height: 270px;
  background: var(--map-sea, #0d0d10);
  position: relative;
  overflow: hidden;
}

.world-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.land-path {
  fill: var(--map-land, #1a1a20);
  stroke: var(--border2);
  stroke-width: .5;
}

/* Node dots */
.map-node-wrap {
  position: absolute;
  transform: translate(-50%, -50%);
}

.map-node-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
}

.map-dot-ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform .2s;
}
.map-node-btn:hover .map-dot-ring { transform: scale(1.4); }

.map-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

/* Online */
.dot-online-ring { color: var(--online); }
.dot-online-ring::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: .3;
  animation: ring-pulse 2s infinite;
}
.dot-online { background: var(--online); }

/* Connected */
.dot-connected-ring { color: var(--accent); }
.dot-connected-ring::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: .5;
  animation: ring-pulse 1.5s infinite;
}
.dot-connected { background: var(--accent); box-shadow: 0 0 8px var(--accent); }

/* Offline */
.dot-offline-ring { color: var(--offline); }
.dot-offline { background: var(--offline); opacity: .7; }

/* Warning */
.dot-warning-ring { color: var(--warning); }
.dot-warning-ring::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: .4;
  animation: ring-pulse 1s infinite;
}
.dot-warning { background: var(--warning); box-shadow: 0 0 6px var(--warning); }

@keyframes ring-pulse {
  0%,100% { transform: scale(1);   opacity: .3; }
  50%      { transform: scale(1.3); opacity: .1; }
}

/* Tooltip */
.map-tip {
  position: absolute;
  z-index: 50;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 12px 14px;
  width: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
  pointer-events: none;
  opacity: 0;
  transition: opacity .1s;
}
.map-tip.visible { opacity: 1; }

.map-tip-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.tip-cat-icon {
  width: 20px;
  height: 20px;
  border-radius: 5px;
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

.tip-status-pill {
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
  font-weight: 500;
}
.pill-online    { background: rgba(79,255,176,.12); color: var(--online);  border: 1px solid rgba(79,255,176,.2); }
.pill-offline   { background: rgba(255,79,107,.1);  color: var(--offline); border: 1px solid rgba(255,79,107,.2); }
.pill-warning   { background: rgba(255,183,79,.12); color: var(--warning); border: 1px solid rgba(255,183,79,.2); }
.pill-connected { background: rgba(79,255,176,.15); color: var(--accent);  border: 1px solid rgba(79,255,176,.3); }

.map-tip-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 3px;
}
.map-tip-val    { color: var(--text); font-size: 10px; font-weight: 500; }
.map-tip-hint   { margin-top: 8px; font-size: 9px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 7px; text-align: center; }
.map-tip-offline { font-size: 10px; color: var(--offline); margin-top: 6px; text-align: center; }

/* Legend */
.map-legend {
  padding: 9px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 18px;
  align-items: center;
}

.map-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--muted);
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.connected-dot {
  background: var(--accent);
  box-shadow: 0 0 5px var(--accent);
}
</style>

