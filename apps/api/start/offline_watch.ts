/*
|--------------------------------------------------------------------------
| Offline watch
|--------------------------------------------------------------------------
|
| Periodic sweep marking nodes offline when their agent stopped
| heartbeating. Without it a dead node stays "online" in the UI forever.
| Runs only in the web environment (see adonisrc preloads).
|
*/
import { markStaleNodesOffline } from '#services/offline_watch'

const SWEEP_INTERVAL_MS = 30_000

const timer = setInterval(async () => {
  try {
    await markStaleNodesOffline()
  } catch (err) {
    console.error('Offline sweep failed:', err)
  }
}, SWEEP_INTERVAL_MS)

// Never keep the process alive just for the sweep (graceful shutdown, tests).
timer.unref()
