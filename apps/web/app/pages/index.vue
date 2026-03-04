<script setup lang="ts">
import type { Node, NodeStatus } from '~/stores/nodes'
import { categoryIcons } from '~/composables/useCategoryIcons'

definePageMeta({ layout: 'default' })

const store = useNodesStore()
onMounted(() => { if (!store.nodes.length) store.fetchNodes() })

const showAddNode = ref(false)

const today = computed(() =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
)

// ── Map coordinate system ──────────────────────────────────────────────────────
// mapUtils.js uses Web Mercator (Google projection via proj4) with these bounds:
const LAT_MIN = -56, LAT_MAX = 71
const LNG_MIN = -179, LNG_MAX = 179

function mercY(lat: number) {
  // Web Mercator Y (same formula as proj4 GOOGLE)
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
}
const M_Y_MAX   = mercY(LAT_MAX)
const M_Y_RANGE = M_Y_MAX - mercY(LAT_MIN)

// ── SVG viewBox detection ──────────────────────────────────────────────────────
// The DottedMap SVG uses preserveAspectRatio="xMidYMid meet", so it centers
// inside its container with blank margins. We read the actual viewBox to
// compute the correct scaling/offset for our overlay.
const mapBodyRef = ref<HTMLElement>()
const svgViewBox = ref<{ w: number; h: number } | null>(null)
const { width: bodyW, height: bodyH } = useElementSize(mapBodyRef)

function initSvgViewBox() {
  const svg = mapBodyRef.value?.querySelector('svg')
  if (!svg) { setTimeout(initSvgViewBox, 200); return }
  const vb = svg.viewBox.baseVal
  if (vb.width && vb.height) svgViewBox.value = { w: vb.width, h: vb.height }
}
onMounted(() => nextTick(initSvgViewBox))

// Convert lat/lng → pixel position inside map-body
function pixelPos(lat: number, lng: number): { x: number; y: number } {
  const vb = svgViewBox.value
  const bw = bodyW.value || 800
  const bh = bodyH.value || 270
  if (!vb) {
    return { x: bw * (lng + 180) / 360, y: bh * (90 - lat) / 180 }
  }
  // preserveAspectRatio="xMidYMid meet" → centered with scale = min ratio
  const scale   = Math.min(bw / vb.w, bh / vb.h)
  const renderW = vb.w * scale
  const renderH = vb.h * scale
  const xOff    = (bw - renderW) / 2
  const yOff    = (bh - renderH) / 2
  // SVG coordinate in viewBox space
  const svgX = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN) * vb.w
  const svgY = (M_Y_MAX - mercY(lat)) / M_Y_RANGE * vb.h
  return {
    x: xOff + (svgX / vb.w) * renderW,
    y: yOff + (svgY / vb.h) * renderH,
  }
}

// ── Clustering ─────────────────────────────────────────────────────────────────
interface ClusterData {
  nodes:               Node[]
  x:                   number
  y:                   number
  status:              NodeStatus
  hasConnected:        boolean
  connectedWasWarning: boolean
}

const STATUS_PRIORITY: Record<NodeStatus, number> = {
  warning: 0, offline: 1, pending: 2, connected: 3, online: 4,
}

// Cluster nodes within the same region (~120 km radius)
const CLUSTER_KM = 500

function geoDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const clusters = computed<ClusterData[]>(() => {
  const positions = store.nodes.map(n => ({ node: n, ...pixelPos(n.lat, n.lng) }))
  const merged    = new Array(positions.length).fill(false)
  const result: ClusterData[] = []

  for (let i = 0; i < positions.length; i++) {
    if (merged[i]) continue
    const group = [positions[i]!]
    merged[i] = true

    for (let j = i + 1; j < positions.length; j++) {
      if (merged[j]) continue
      const ni = positions[i]!.node
      const nj = positions[j]!.node
      if (geoDistance(ni.lat, ni.lng, nj.lat, nj.lng) <= CLUSTER_KM) {
        group.push(positions[j]!)
        merged[j] = true
      }
    }

    const cx         = group.reduce((s, p) => s + p.x, 0) / group.length
    const cy         = group.reduce((s, p) => s + p.y, 0) / group.length
    const groupNodes = group.map(p => p.node)

    // For single nodes use actual status (preserves 'connected' for glow).
    // For clusters use savedStatus for connected nodes so ring colors stay accurate.
    const effectiveStatus = (n: Node): NodeStatus =>
      n.status === 'connected' ? (store.savedStatus[n.id] ?? 'online') : n.status
    const worstStatus = groupNodes.length === 1
      ? groupNodes[0]!.status
      : groupNodes.map(effectiveStatus).sort((a, b) => STATUS_PRIORITY[a] - STATUS_PRIORITY[b])[0]!

    const connectedNode        = groupNodes.find(n => n.status === 'connected')
    const hasConnected         = !!connectedNode
    const connectedWasWarning  = connectedNode ? store.savedStatus[connectedNode.id] === 'warning' : false

    result.push({ nodes: groupNodes, x: cx, y: cy, status: worstStatus, hasConnected, connectedWasWarning })
  }

  return result
})

// ── Tooltip ────────────────────────────────────────────────────────────────────
const hoveredCluster = ref<ClusterData | null>(null)
const tooltipStyle   = ref<Record<string, string>>({})

// Delay-based close: allows moving mouse from marker → tooltip without flickering
let closeTimer: ReturnType<typeof setTimeout> | null = null
function cancelClose() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null } }
function scheduleClose() { cancelClose(); closeTimer = setTimeout(() => { hoveredCluster.value = null }, 150) }

function onClusterEnter(cluster: ClusterData, e: MouseEvent) {
  cancelClose()
  hoveredCluster.value = cluster
  const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const cx    = Math.min(Math.max(rect.left + rect.width / 2, 115), window.innerWidth - 115)
  const above = rect.top > 160
  tooltipStyle.value = {
    left:      `${cx}px`,
    top:       above ? `${rect.top}px` : `${rect.bottom + 10}px`,
    transform: above
      ? 'translateX(-50%) translateY(calc(-100% - 10px))'
      : 'translateX(-50%)',
  }
}

// Click on a single node (marker click or single-node tooltip footer)
function onClusterClick(cluster: ClusterData) {
  if (cluster.nodes.length === 1) {
    const node = cluster.nodes[0]!
    if (node.status === 'connected') store.disconnect()
    else if (node.status === 'online' || node.status === 'warning') store.setConnected(node.id)
    cancelClose()
    hoveredCluster.value = null
  } else {
    navigateTo('/nodes')
  }
}

// Click on a row inside a multi-node cluster tooltip
function onClusterNodeClick(node: Node) {
  if (node.status === 'connected') store.disconnect()
  else if (node.status === 'online' || node.status === 'warning') store.setConnected(node.id)
  cancelClose()
  hoveredCluster.value = null
}

async function goToNodes() {
  cancelClose()
  hoveredCluster.value = null
  await nextTick()
  navigateTo('/nodes')
}

function onConnect(node: Node) { store.setConnected(node.id) }
function onCut()               { store.disconnect() }
</script>

<template>
  <div class="dashboard">

    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-sub">{{ today }}</div>
      </div>
      <button class="btn-primary" @click="showAddNode = true">+ Nouveau noeud</button>
    </div>

    <!-- Stat cards -->
    <div class="stat-grid mb">
      <div class="stat-card">
        <div class="stat-lbl">Noeuds actifs</div>
        <div class="stat-val">
          <span style="color: var(--accent)">{{ store.onlineCount }}</span>
          <span class="stat-suffix">/{{ store.nodes.length }}</span>
        </div>
        <div class="stat-sub">{{ store.nodes.length - store.onlineCount }} hors ligne · {{ store.warningCount }} alerte</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Appareils</div>
        <div class="stat-val"><span>{{ store.nodes.length }}</span></div>
        <div class="stat-sub">enregistrés</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Bande passante</div>
        <div class="stat-val">
          <span>1.2</span>
          <span class="stat-suffix">GB</span>
        </div>
        <div class="stat-sub">aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Latence moy.</div>
        <div class="stat-val">
          <span style="color: var(--accent)">{{ store.avgLatency ?? '—' }}</span>
          <span v-if="store.avgLatency" class="stat-suffix">ms</span>
        </div>
        <div class="stat-sub">sur les noeuds actifs</div>
      </div>
    </div>

    <!-- World map -->
    <div class="map-card mb">
      <div class="map-header">
        <span class="map-title">Carte des noeuds</span>
        <span class="map-hint">Clic pour se connecter</span>
      </div>
      <div ref="mapBodyRef" class="map-body">
        <!-- DottedMap: pointer-events disabled → prevents pan/zoom conflict with overlay -->
        <div class="map-bg-layer">
          <ClientOnly>
            <DottedMap :points="[]" :dot-size="0.3" class="w-full h-full" />
          </ClientOnly>
        </div>

        <!-- Marker overlay — uses pixel positions to match SVG projection -->
        <div class="map-overlay">
          <div
            v-for="(cluster, idx) in clusters"
            :key="idx"
            class="map-marker"
            :style="{ left: `${cluster.x}px`, top: `${cluster.y}px` }"
            @mouseenter="onClusterEnter(cluster, $event)"
            @mouseleave="scheduleClose()"
            @click="onClusterClick(cluster)"
          >
            <!-- Single node -->
            <template v-if="cluster.nodes.length === 1">
              <div
                class="marker-dot"
                :class="cluster.status === 'connected' && store.savedStatus[cluster.nodes[0]!.id] === 'warning'
                  ? 'm-connected-warn'
                  : `m-${cluster.status}`"
              />
              <div
                v-if="cluster.status === 'online' || cluster.status === 'warning'"
                class="marker-ring"
                :class="`m-${cluster.status}`"
              />
            </template>

            <!-- Cluster (2+ nodes) -->
            <template v-else>
              <div class="cluster-badge" :class="[`m-${cluster.status}`, { 'has-connected': cluster.hasConnected && !cluster.connectedWasWarning, 'has-connected-warn': cluster.connectedWasWarning }]">
                <div class="cluster-inner" />
              </div>
              <div v-if="!cluster.hasConnected" class="cluster-ring" :class="`m-${cluster.status}`" />
              <div v-if="!cluster.hasConnected" class="cluster-ring cluster-ring-delay" :class="`m-${cluster.status}`" />
              <div class="cluster-count">{{ cluster.nodes.length > 9 ? '9+' : cluster.nodes.length }}</div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Nodes section -->
    <div class="section-header">
      <span class="section-title">Noeuds</span>
      <NuxtLink to="/nodes" class="section-link">Voir tout →</NuxtLink>
    </div>

    <!-- Node table -->
    <div class="node-table">
      <div class="t-head">
        <span>Noeud</span>
        <span>Localisation</span>
        <span>Statut</span>
        <span>Latence</span>
        <span>CPU</span>
        <span></span>
      </div>
      <NodeTableRow
        v-for="node in store.nodes"
        :key="node.id"
        :node="node"
        @click="navigateTo(`/nodes/${node.id}`)"
        @connect="onConnect"
        @cut="onCut"
      />
      <div v-if="!store.nodes.length" class="t-empty">Aucun noeud</div>
    </div>

  </div>

  <!-- Tooltip (teleported to body to avoid overflow clipping) -->
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="hoveredCluster"
        class="map-tooltip"
        :style="tooltipStyle"
        @mouseenter="cancelClose()"
        @mouseleave="scheduleClose()"
      >

        <!-- Single node -->
        <template v-if="hoveredCluster.nodes.length === 1">
          <div class="mtt-head">
            <div class="nicon" :class="`cat-${hoveredCluster.nodes[0]!.category}`" style="width:22px;height:22px;flex-shrink:0">
              <UIcon :name="categoryIcons[hoveredCluster.nodes[0]!.category]" style="width:12px;height:12px" />
            </div>
            <div style="flex:1;min-width:0">
              <div class="mtt-name">{{ hoveredCluster.nodes[0]!.name }}</div>
            </div>
            <StatusBadge :status="hoveredCluster.nodes[0]!.status" />
          </div>
          <div class="mtt-rows">
            <div class="mtt-row">
              <span class="mtt-lbl">Localisation</span>
              <span class="mtt-val">{{ hoveredCluster.nodes[0]!.location }}</span>
            </div>
            <div class="mtt-row">
              <span class="mtt-lbl">Latence</span>
              <span class="mtt-val">{{ hoveredCluster.nodes[0]!.latency !== null ? `${hoveredCluster.nodes[0]!.latency}ms` : '—' }}</span>
            </div>
            <div class="mtt-row">
              <span class="mtt-lbl">CPU</span>
              <span class="mtt-val">{{ hoveredCluster.nodes[0]!.cpu !== null ? `${hoveredCluster.nodes[0]!.cpu}%` : '—' }}</span>
            </div>
          </div>
          <div
            class="mtt-foot"
            :class="{ 'mtt-foot-action': hoveredCluster.nodes[0]!.status !== 'offline' && hoveredCluster.nodes[0]!.status !== 'pending' }"
            @click="onClusterClick(hoveredCluster!)"
          >
            <span v-if="hoveredCluster.nodes[0]!.status === 'connected'" style="color:var(--accent)">Cliquer pour déconnecter</span>
            <span v-else-if="hoveredCluster.nodes[0]!.status === 'offline'">Noeud hors ligne</span>
            <span v-else-if="hoveredCluster.nodes[0]!.status === 'pending'">Connexion en attente…</span>
            <span v-else>Cliquer pour se connecter</span>
          </div>
        </template>

        <!-- Cluster (2+ nodes) -->
        <template v-else>
          <div class="mtt-head">
            <div class="mtt-name">{{ hoveredCluster.nodes.length }} noeuds</div>
          </div>
          <div class="mtt-cluster-list">
            <div
              v-for="n in hoveredCluster.nodes"
              :key="n.id"
              class="mtt-cluster-row"
              :class="{ 'mtt-cluster-row-action': n.status !== 'offline' && n.status !== 'pending' }"
              @click.stop="onClusterNodeClick(n)"
            >
              <div class="nicon" :class="`cat-${n.category}`" style="width:18px;height:18px;flex-shrink:0">
                <UIcon :name="categoryIcons[n.category]" style="width:10px;height:10px" />
              </div>
              <span class="mtt-cluster-name">{{ n.name }}</span>
              <StatusBadge :status="n.status" />
            </div>
          </div>
          <div class="mtt-foot mtt-foot-action" @click="goToNodes()">Voir tous les noeuds →</div>
        </template>

      </div>
    </Teleport>
  </ClientOnly>

  <AddNodeModal v-if="showAddNode" @close="showAddNode = false" />
</template>

