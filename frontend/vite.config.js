import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import dotenv from 'dotenv'

dotenv.config()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // repassa /api/* para o backend (evita erro de CORS no navegador)
    // ex.: /api/usuarios -> http://localhost:3000/usuarios
    proxy: {
      '/api': {
        target: 'http://localhost:' + process.env.API_PORT,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
