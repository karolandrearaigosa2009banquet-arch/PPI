import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // En GitHub Pages la app vive en /PPI/; en desarrollo (Codespaces/local) en /.
  base: command === 'build' ? '/PPI/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.app.github.dev', 'localhost'],
  },
}))
