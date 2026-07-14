import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, el frontend corre en 5173 y proxea /api al backend (8086).
// En produccion el backend sirve el build estatico, asi que esto no se usa.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8086',
    },
  },
  build: {
    outDir: 'dist',
  },
})
