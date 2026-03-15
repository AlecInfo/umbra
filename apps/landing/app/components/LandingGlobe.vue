<script setup lang="ts">

const globeRef = ref<HTMLCanvasElement>()
const overlayRef = ref<HTMLCanvasElement>()

// ── Geometry constants ─────────────────────────────────────────────
const THETA = 0.2
const COS_T = Math.cos(THETA)
const SIN_T = Math.sin(THETA)
const STEPS = 180

const NODES: [number, number][] = [
  [46.2, 6.15], [50.1, 8.68], [51.5, -0.12], [40.7, -74.0],
  [-23.5, -46.6], [1.35, 103.8], [35.7, 139.7], [-33.9, 151.2],
  [37.8, -122.4], [48.9, 2.35]
]
const ARC_PAIRS: [number, number][] = [
  [0, 1], [0, 2], [0, 9], [2, 3], [3, 8], [5, 6], [5, 7], [8, 5], [4, 8], [1, 3]
]

// ── Pre-compute static 3D unit-sphere positions (done once) ────────
type V3 = [number, number, number]

function to3D(lat: number, lon: number): V3 {
  const phi = (lat * Math.PI) / 180
  const lam = (lon * Math.PI) / 180
  const cp = Math.cos(phi)
  return [cp * Math.cos(lam), Math.sin(phi), -cp * Math.sin(lam)]
}

function slerp3D(a: V3, b: V3, t: number): V3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const omega = Math.acos(dot)
  if (omega < 0.0001) return a
  const so = Math.sin(omega)
  const s1 = Math.sin((1 - t) * omega) / so
  const s2 = Math.sin(t * omega) / so
  return [s1 * a[0] + s2 * b[0], s1 * a[1] + s2 * b[1], s1 * a[2] + s2 * b[2]]
}

const NODES_3D: V3[] = NODES.map(([lat, lon]) => to3D(lat, lon))

const ARC_PTS_3D: V3[][] = ARC_PAIRS.map(([i, j]) => {
  const a = NODES_3D[i]!, b = NODES_3D[j]!
  const pts: V3[] = []
  for (let s = 0; s <= STEPS; s++) {
    pts.push(slerp3D(a, b, s / STEPS))
  }
  return pts
})

// ── Globe state ────────────────────────────────────────────────────
let phi = 0.5
let initDpr = 1
let destroyGlobe: (() => void) | undefined
const pulses = ARC_PAIRS.map((_, i) => ({ t: i * 0.1 }))

// ── Overlay rendering ──────────────────────────────────────────────
// Called from inside cobe's onRender → same phi, same frame, perfectly synced
function drawOverlay(W: number, H: number, dpr: number) {
  const canvas = overlayRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')!

  // Force CSS display size to exactly match the globe canvas dimensions.
  // Setting canvas.width (the HTML attribute) can override CSS width:100% in
  // some browsers at non-integer DPR values, causing the two canvases to shift.
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'

  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2
  const R = Math.min(W, H) * 0.4
  const cosP = Math.cos(phi)
  const sinP = Math.sin(phi)

  function proj([x, y, z]: V3) {
    const x1 = x * cosP + z * sinP
    const z1 = -x * sinP + z * cosP
    const y2 = y * COS_T - z1 * SIN_T
    const z2 = y * SIN_T + z1 * COS_T
    return { sx: cx + x1 * R, sy: cy - y2 * R, vis: z2 > 0 }
  }

  // ── Arcs (base + pulse) ──
  ARC_PAIRS.forEach((_pair, aIdx) => {
    const raw = ARC_PTS_3D[aIdx]!
    const pts = raw.map(v => proj(v))

    ctx.beginPath()
    let first = true
    for (const p of pts) {
      if (!p.vis) {
        first = true
        continue
      }
      if (first) {
        ctx.moveTo(p.sx, p.sy)
        first = false
      } else {
        ctx.lineTo(p.sx, p.sy)
      }
    }
    ctx.strokeStyle = 'rgba(79,255,176,0.18)'
    ctx.lineWidth = 1.0
    ctx.stroke()

    const pct = pulses[aIdx]!.t
    const pS = Math.max(0, pct - 0.15)
    const pE = Math.min(1, pct + 0.15)
    ctx.beginPath()
    first = true
    for (let s = 0; s <= STEPS; s++) {
      const t2 = s / STEPS
      if (t2 < pS || t2 > pE) {
        first = true
        continue
      }
      const p = pts[s]
      if (!p || !p.vis) {
        first = true
        continue
      }
      if (first) {
        ctx.moveTo(p.sx, p.sy)
        first = false
      } else {
        ctx.lineTo(p.sx, p.sy)
      }
    }
    ctx.strokeStyle = 'rgba(79,255,176,0.95)'
    ctx.lineWidth = 2.2
    ctx.stroke()

    pulses[aIdx]!.t = (pulses[aIdx]!.t + 0.003) % 1
  })

  // ── Nodes ──
  for (const v of NODES_3D) {
    const { sx, sy, vis } = proj(v)
    if (!vis) continue

    ctx.beginPath()
    ctx.arc(sx, sy, 16, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(79,255,176,0.07)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(sx, sy, 6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(79,255,176,0.22)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(sx, sy, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#4fffb0'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }
}

// ── Init ───────────────────────────────────────────────────────────
async function initGlobe() {
  const canvas = globeRef.value
  if (!canvas) return

  const { default: createGlobe } = await import('cobe')

  initDpr = window.devicePixelRatio || 1
  const W = canvas.offsetWidth || 920
  const H = canvas.offsetHeight || 920

  const globe = createGlobe(canvas, {
    devicePixelRatio: initDpr,
    width: W * initDpr,
    height: H * initDpr,
    phi,
    theta: THETA,
    dark: 1,
    diffuse: 1.6,
    mapSamples: 20000,
    mapBrightness: 5.5,
    baseColor: [0.18, 0.19, 0.23],
    markerColor: [0.31, 1, 0.69],
    glowColor: [0.14, 0.28, 0.22],
    markers: [],
    onRender(state) {
      const light = document.documentElement.classList.contains('light')
      state.dark = light ? 0 : 1
      state.diffuse = light ? 2.2 : 1.6
      state.mapBrightness = light ? 1.5 : 5.5
      state.baseColor = light ? [0.95, 0.96, 0.98] : [0.18, 0.19, 0.23]
      state.glowColor = light ? [0.75, 0.85, 0.9] : [0.14, 0.28, 0.22]
      state.phi = phi
      phi += 0.0005
      const dpr = window.devicePixelRatio || 1
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      drawOverlay(W, H, dpr)
    }
  })

  destroyGlobe = globe.destroy
}

function cleanup() {
  destroyGlobe?.()
  destroyGlobe = undefined
}

// ── Zoom detection ──────────────────────────────────────────────────
// Browser zoom changes window.devicePixelRatio and fires a resize event.
// Cobe fixes its WebGL projection at init time, so we destroy + recreate
// it when DPR changes — equivalent to F5 at the new zoom level.
function onResize() {
  const newDpr = window.devicePixelRatio || 1
  if (newDpr !== initDpr) {
    cleanup()
    nextTick(initGlobe)
  }
}

onMounted(() => {
  nextTick(initGlobe)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="l-globe-wrap">
    <canvas
      ref="globeRef"
      class="l-globe-canvas"
      aria-hidden="true"
    />
    <canvas
      ref="overlayRef"
      class="l-globe-overlay"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.l-globe-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
</style>
