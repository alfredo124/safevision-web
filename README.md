# SafeVision Web

Frontend de SafeVision (React + TypeScript + Vite + Tailwind): inicio de sesión, monitoreo con los recuadros del
motor dibujados sobre el video, alertas por validar, incidencias, reglas por taller y reportes.

> **Guía completa de instalación en otra PC, paso a paso** (programas necesarios, descarga, instalación, arranque,
> primer uso, celular y solución de problemas): está en el README del backend,
> [safevision-baken → *Guía de instalación paso a paso*](https://github.com/alfredo124/safevision-baken#guía-de-instalación-paso-a-paso-en-otra-pc).
> Aquí solo va lo del frontend.

Los dos repositorios deben estar en la misma carpeta, y la del backend debe llamarse `safevison_baken`:
```text
C:\git\universidad\
├── safevison_baken\   git clone https://github.com/alfredo124/safevision-baken.git safevison_baken
└── safevision-web\    git clone https://github.com/alfredo124/safevision-web.git safevision-web
```

## Instalar y arrancar (Windows)
1. Requisito: **Node.js LTS, versión 22 o 24** (https://nodejs.org). Vite exige como mínimo 20.19 o 22.12;
   `instalar.bat` lo comprueba.
2. Doble clic en `instalar.bat` (una vez): ejecuta `npm install`.
3. Arranca primero el backend (`safevison_baken\iniciar.bat`) y deja su ventana abierta.
4. Doble clic en `iniciar.bat` (cada vez): sirve la web en el puerto 5173 para este equipo y la red local.
5. Abre http://localhost:5173 y entra con `admin`. Desde otro equipo o el celular, usa la dirección *Network* que
   muestra la ventana. Qué IP usar en Wi-Fi o con los datos compartidos de un celular, y qué hacer al cambiar de red:
   README del backend, paso 7.

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
│   └── pages/      Login, ConfiguracionInicial, Monitoreo, EstacionCamara, ConfigReglas, Incidencias,
│                   Reportes, Usuarios, Bitacora
└── main.tsx
```

## Problemas comunes
- *Error al conectar con el servidor*: el backend no está arrancado o, desde otro equipo, falta la regla del firewall
  en el PC servidor (ver la guía del backend).
- La cámara del celular no se puede usar con `http://`: el navegador exige HTTPS. Usa `iniciar_https.bat` aquí y en
  el backend (guía del backend, paso 7b).
- Errores de módulos: vuelve a ejecutar `instalar.bat`.
