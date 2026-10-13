import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, isPreview }) => ({
  // En GitHub Pages la app vive en /PPI/ (build y preview); en desarrollo (Codespaces/local) en /.
  base: command === 'build' || isPreview ? '/PPI/' : '/',
  plugins: [react()],
  define: {
    // Marca de versión visible en el pie de página (en GitHub Actions viene del commit).
    __APP_VERSION__: JSON.stringify(`${(process.env.GITHUB_SHA || 'local').slice(0, 7)} · ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`),
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false, // si el 5173 está ocupado, Vite usa el siguiente puerto libre y lo muestra en pantalla
    allowedHosts: ['.app.github.dev', 'localhost'],
  },
}))
