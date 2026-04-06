import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@excalidraw/excalidraw'],
  },
  build: {
    commonjsOptions: {
      include: [/@excalidraw\/excalidraw/, /node_modules/],
    },
  },
})
