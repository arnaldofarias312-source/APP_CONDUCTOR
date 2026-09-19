import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // Permite probar desde el celular en la misma red WiFi
    port: 5173,
    https: true, // Requerido por navegadores móviles para permitir acceso a la cámara
  },
})

