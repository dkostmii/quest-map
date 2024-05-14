import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '~mapbox-gl-style': path.resolve(__dirname, 'node_modules/mapbox-gl/dist/mapbox-gl.css')
    }
  }
})
