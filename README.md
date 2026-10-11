# SafeVision Web

Frontend del sistema SafeVision, desarrollado con React + TypeScript + Vite.

## Descripción
Este proyecto contiene la interfaz de usuario para el sistema de monitoreo de EPP, donde se muestran:
- login de usuarios
- dashboard de monitoreo
- visualización de incidencias
- reportes y configuración de reglas
- navegación principal para el usuario administrador

## Requisitos previos
Antes de instalar dependencias, asegúrate de tener:
- Node.js 18 o superior
- npm o yarn
- acceso a la carpeta del proyecto

## Instalación de dependencias
Desde la raíz del proyecto `safevision-web`, ejecuta:

### Windows (PowerShell)
```powershell
cd c:\git\universidad\safevision-web
npm install
```

### Linux / macOS
```bash
cd /ruta/al/proyecto/safevision-web
npm install
```

## Dependencias del proyecto
El proyecto usa estas librerías principales:

### Producción
- `react`
- `react-dom`
- `react-router-dom`
- `lucide-react`

### Desarrollo
- `vite`
- `typescript`
- `@vitejs/plugin-react`
- `eslint`
- `tailwindcss`
- `postcss`
- `autoprefixer`

## Ejecución del frontend
Para arrancar el proyecto en modo desarrollo:

```bash
npm run dev
```

Esto levantará la app en modo Vite, normalmente en:
- http://localhost:5173

## Build de producción
Para generar la versión lista para despliegue:

```bash
npm run build
```

Luego puedes previsualizarla con:

```bash
npm run preview
```

## Verificación rápida
Si todo está bien, al ejecutar:

```bash
npm run dev
```

la terminal mostrará la URL local donde se está sirviendo la aplicación.

## Solución rápida de problemas comunes
- Si aparece error de módulos, ejecuta `npm install` otra vez.
- Si hay conflictos de dependencias, borra la carpeta `node_modules` y vuelve a instalar.
- Si el navegador no carga, revisa que Vite esté levantado en el puerto 5173.

## Estructura del proyecto
```text
safevision-web/
├── public/
├── src/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── README.md
```

Con estas instrucciones cualquier colaborador puede clonar el proyecto y ejecutar el frontend sin problemas en su entorno local.

