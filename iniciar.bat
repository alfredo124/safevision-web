@echo off
rem Arranca el frontend de SafeVision en el puerto 5173, accesible desde la red local.
rem Sin .env.local, la web busca el backend en el mismo equipo, puerto 8000.
cd /d "%~dp0"
echo Abre la direccion "Network" que aparece abajo desde otros equipos o el celular.
call npm run dev:lan
pause
