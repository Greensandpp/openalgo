/** Isolated mobile demo build; never pulls in production broker app. */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { global: 'globalThis' },
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: 'dist-greensoil-preview',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: path.resolve(__dirname, 'greensoil-preview.html') },
  },
})
