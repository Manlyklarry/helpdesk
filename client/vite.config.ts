import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: !!process.env.VITE_PORT,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || 3000}`,
        changeOrigin: true,
        headers: {
          origin: `http://localhost:${process.env.VITE_API_PORT || 3000}`,
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
