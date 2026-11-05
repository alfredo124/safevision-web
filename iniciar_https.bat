@echo off
rem Frontend con HTTPS en el puerto 5173 (necesario para la camara del celular u otro equipo).
rem Requiere el certificado del backend: arranca antes safevison_baken\iniciar_https.bat.
cd /d "%~dp0"
echo Abre la direccion "Network" (https://...) desde el celular. La primera vez acepta la advertencia.
call npm run dev:https
pause
