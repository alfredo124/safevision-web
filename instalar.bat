@echo off
rem Instalación del frontend de SafeVision (una sola vez por PC).
cd /d "%~dp0"
where npm >nul 2>nul || (echo [ERROR] No se encontro Node.js. Instala Node.js 20 o superior, version LTS. & pause & exit /b 1)
call npm install || (echo [ERROR] Fallo npm install & pause & exit /b 1)
echo.
echo Listo. Para arrancar el frontend: iniciar.bat
pause
