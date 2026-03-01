// Restore the connected node from localStorage after SSR hydration.
// Runs client-only so it never conflicts with server state.
// Note: VueUse's 'any' serializer stores values with String(), NOT JSON.stringify(),
// so we read the raw string directly (no JSON.parse needed).
export default defineNuxtPlugin(() => {
  const store = useNodesStore()
  const id = localStorage.getItem('umbra-connected-id')
  if (!id || id === 'null') return
  if (store.nodes.some(n => n.id === id)) {
    store.setConnected(id)
  }
})
