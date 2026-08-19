/*
|--------------------------------------------------------------------------
| Periodic sweeps
|--------------------------------------------------------------------------
|
| Two things nothing else can do:
|   - mark nodes offline once their agent stops heartbeating, otherwise a dead
|     node stays "online" in the UI forever;
|   - resolve the device and traffic of open sessions, which are unknowable at
|     /connect time (the client has not joined the mesh yet).
|
| Runs only in the web environment (see adonisrc preloads).
|
*/
import { markStaleNodesOffline } from '#services/offline_watch'
import { syncConnectionTraffic } from '#services/connection_traffic'

const SWEEP_INTERVAL_MS = 30_000

const timer = setInterval(async () => {
  try {
    await markStaleNodesOffline()
  } catch (err) {
    console.error('Offline sweep failed:', err)
  }

  try {
    await syncConnectionTraffic()
  } catch (err) {
    console.error('Connection traffic sweep failed:', err)
  }
}, SWEEP_INTERVAL_MS)

// Never keep the process alive just for the sweep (graceful shutdown, tests).
timer.unref()
