import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
