@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Installa Node.js 24 da nodejs.org e riapri questo file.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24){console.error('Serve Node.js 24 o successivo');process.exit(1)}"
if errorlevel 1 (pause & exit /b 1)
call npm ci --omit=dev --no-audit --no-fund
if errorlevel 1 (pause & exit /b 1)
node --env-file-if-exists=.env scripts/play.mjs
pause
