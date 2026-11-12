@echo off
cd /d "%~dp0"
echo Abre http://localhost:3000 en tu navegador.
echo Para otro dispositivo usa http://IP-DE-ESTE-EQUIPO:3000
node server.js
pause
