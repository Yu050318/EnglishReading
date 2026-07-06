@echo off
setlocal
title English Reading Quiz
cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] package.json was not found. Keep this launcher in the project root.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js and try again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js and try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First launch: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed. Check the network and npm settings.
    pause
    exit /b 1
  )
)

echo.
echo Computer URL: http://localhost:5173
echo Phone: use the Network URL shown by Vite while connected to the same Wi-Fi.
echo Allow Node.js on private networks if Windows Firewall asks.
echo Press Ctrl+C or close this window to stop the site.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173'"
call npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo The site stopped or failed to start. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
