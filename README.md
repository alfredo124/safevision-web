# SafeVision Web

Frontend de SafeVision (React + TypeScript + Vite + Tailwind): inicio de sesión, monitoreo con los recuadros del
motor dibujados sobre el video, alertas por validar, incidencias, reglas por taller y reportes.

> **Guía completa de instalación del equipo:** está en el README del backend
> (`safevison_baken/README.md`, sección *Guía rápida de instalación*). Aquí solo va lo del frontend.

## Instalar y arrancar (Windows)
1. Requisito: **Node.js 20 o superior, versión LTS** (https://nodejs.org).
2. Doble clic en `instalar.bat` (una vez): ejecuta `npm install`.
3. Doble clic en `iniciar.bat` (cada vez): sirve la web en el puerto 5173 para este equipo y la red local.
4. Abre http://localhost:5173. Desde otro equipo o el celular, usa la dirección *Network* que muestra la ventana.
   Qué IP usar en Wi-Fi o con los datos compartidos de un celular, y qué hacer al cambiar de red: README del backend,
   sección 4 (`safevison_baken/README.md`).

El backend debe estar arrancado (`safevison_baken\iniciar.bat`).

## Dirección del backend
- Por defecto la web busca el backend **en el mismo equipo que sirve la página, puerto 8000**
  (por ejemplo, si abres `http://192.168.1.9:5173`, usa `http://192.168.1.9:8000`). No hay que recompilar si cambia la IP.
- Para otra dirección, copia `.env.example` como `.env.local` y define `VITE_API_URL`
  (por ejemplo `http://192.168.1.20:8000`). `.env.local` no se sube a Git.
- Con HTTPS, el WebSocket usa `wss://` automáticamente.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo, solo en este equipo |
| `npm run dev:lan` | Desarrollo, accesible desde la red local (lo usa `iniciar.bat`) |
| `npm run dev:https` | Igual, con HTTPS (lo usa `iniciar_https.bat`); necesario para la cámara del celular |
| `npm run build` | Compila para producción en `dist/` |
| `npx tsc -b` | Comprueba los tipos de TypeScript (`build` no lo hace) |
| `npm run lint` | Revisa el código con ESLint |

## Estructura
```text
src/
├── hooks/          useAuth, useCameraOverlay (mensajes del motor por WebSocket)
├── services/       apiConfig (dirección del backend), authService, reglasLabService
├── views/
│   ├── components/ AlertasPanel, CameraOverlay, CapturaModal, EstadoCamara, PracticaControl, SnapshotImage, ...
│   ├── layouts/    MainLayout (incluye el panel global de alertas)
│   └── pages/      Login, Monitoreo, ConfigReglas, Incidencias, Reportes
└── main.tsx
```

## Problemas comunes
- *Error al conectar con el servidor*: el backend no está arrancado o, desde otro equipo, falta la regla del firewall
  en el PC servidor (ver la guía del backend).
- La cámara del celular no se puede usar con `http://`: el navegador exige HTTPS. Usa `iniciar_https.bat` aquí y en
  el backend (guía del backend, sección *Usar la cámara del celular*).
- Errores de módulos: vuelve a ejecutar `instalar.bat`.
