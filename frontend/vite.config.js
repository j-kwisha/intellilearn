import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    // Force new hash for cache busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-2026-10-03.js`,
        chunkFileNames: `assets/[name]-[hash]-2026-10-03.js`,
        assetFileNames: `assets/[name]-[hash]-2026-10-03.[ext]`
      }
    }
  }
})
