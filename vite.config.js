import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['lightweight-charts'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://www.leebean.top',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://www.leebean.top',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://www.leebean.top',
        changeOrigin: true,
      },
    },
  },
})
