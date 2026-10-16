import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WEB_PORT ?? process.env.PORT ?? 4300),
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.COBRIX_API_URL ?? 'http://127.0.0.1:4320',
      },
    },
  },
})
