import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Modo HTTPS (npm run dev:https): usa el certificado de la red local creado por
// safevison_baken/tools/crear_certificado.py. Necesario para usar la cámara desde otro equipo o el celular.
function httpsOptions(mode: string) {
  if (mode !== 'https') return undefined
  const dir = process.env.SAFEVISION_CERT_DIR ?? path.resolve(__dirname, '../safevison_baken/certs')
  const key = path.join(dir, 'safevision.key')
  const cert = path.join(dir, 'safevision.crt')
  if (!fs.existsSync(key) || !fs.existsSync(cert)) {
    throw new Error(`No se encontró el certificado en ${dir}. Ejecuta: python tools/crear_certificado.py en safevison_baken`)
  }
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: { https: httpsOptions(mode) },
}))
