import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    fs: {
      // Allow serving files from the SDK directory
      allow: ['..', '../..']
    }
  },
  optimizeDeps: {
    exclude: ['@modelhealth/sdk']
  }
})
