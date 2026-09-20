import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The /functions directory is handled by Cloudflare Pages Functions, not Vite.
// Vite only builds the client SPA into /dist.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
