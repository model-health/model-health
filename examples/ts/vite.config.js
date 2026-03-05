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
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings for node_modules
        if (warning.code === 'SOURCEMAP_ERROR' && warning.message.includes('node_modules')) {
          return;
        }
        warn(warning);
      }
    }
  },
  optimizeDeps: {
    exclude: ['@modelhealth/modelhealth']
  }
})
