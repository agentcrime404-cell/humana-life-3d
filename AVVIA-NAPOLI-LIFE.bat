@echo off
rem Avvia Napoli life (3D) sul PC. Serve Node.js 24 (nodejs.org). Il gioco si apre su http://localhost:3079/
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Installa Node.js 24 da nodejs.org e riapri questo file.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm ci --omit=dev --no-audit --no-fund
 if errorlevel 1 (pause & exit /b 1)
)
start "" http://localhost:3079/
node --env-file-if-exists=.env scripts/play-3d.mjs
pause
