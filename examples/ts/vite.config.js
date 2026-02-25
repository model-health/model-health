import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      // Allow serving files from the SDK directory
      allow: ['..', '../..']
    }
  },
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['@modelhealth/modelhealth']
  }
})
