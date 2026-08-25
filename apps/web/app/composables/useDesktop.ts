/*
| Bridge to the native side, when there is one.
|
| The same Nuxt application is the website, the desktop app and the mobile app —
| Tauri only wraps it in a webview. So every call here has to be safe to reach
| from a plain browser, where the bridge simply does not exist: `available` is
| false and the UI falls back to the copy-paste commands the server already
| returns.
|
| The bridge is read off the window rather than imported from @tauri-apps/api,
| so the web build carries no Tauri code at all. Tauri injects it when
| `withGlobalTauri` is on.
*/

export interface TailscaleStatus {
  installed: boolean
  running: boolean
  ip: string | null
  /** IP of the exit node currently in use, if any. */
  exit_node: string | null
  backend_state: string | null
}

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>

interface TauriGlobal {
  core?: { invoke: Invoke }
}

function bridge(): TauriGlobal | null {
  if (!import.meta.client) return null
  const tauri = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__
  return tauri?.core ? tauri : null
}

/** True inside a Tauri webview — desktop or mobile — false in a browser. */
export function isDesktopApp(): boolean {
  return bridge() !== null
}

export function useDesktop() {
  function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const b = bridge()
    if (!b?.core) return Promise.reject(new Error('not running inside the app'))
    return b.core.invoke<T>(cmd, args)
  }

  return {
    available: isDesktopApp(),

    /** Reads local state. Needs no privileges, so it is safe to poll. */
    status: () => invoke<TailscaleStatus>('tailscale_status'),

    /** First connection: joins the mesh and selects the exit node in one step. */
    join: (loginServer: string, authKey: string, exitNode: string) =>
      invoke<string>('tailscale_join', { loginServer, authKey, exitNode }),

    /** Already on the mesh: switching exit node needs no key. */
    setExitNode: (exitNode: string) =>
      invoke<string>('tailscale_set_exit_node', { exitNode }),

    /** Stops routing through an exit node without leaving the mesh. */
    clearExitNode: () => invoke<string>('tailscale_clear_exit_node'),
  }
}
