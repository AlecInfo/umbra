import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Tauri serves the frontend from a fixed port in dev and expects a relative
// base in the bundle.
export default defineConfig({
  plugins: [vue()],
  base: './',
  clearScreen: false,
  server: { port: 5273, strictPort: true },
  build: { target: 'esnext' },
})
