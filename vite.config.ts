import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// Tauri expects a fixed port and serves the built assets from ../dist.
export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    target: 'chrome120',
    outDir: 'dist',
    emptyOutDir: true,
  },
})
