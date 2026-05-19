import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/noahs-reader/' : '/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
})
