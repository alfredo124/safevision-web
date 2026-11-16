@echo off
rem Instalación del frontend de SafeVision (una sola vez por PC).
cd /d "%~dp0"
where npm >nul 2>nul || (echo [ERROR] No se encontro Node.js. Instala Node.js LTS, version 22 o 24, desde https://nodejs.org. & pause & exit /b 1)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)" || (echo [ERROR] Se necesita Node.js 20.19, 22.12 o superior. Version instalada: & node --version & echo Instala la version LTS desde https://nodejs.org. & pause & exit /b 1)
call npm install || (echo [ERROR] Fallo npm install & pause & exit /b 1)
echo.
echo Listo. Para arrancar el frontend: iniciar.bat
pause
