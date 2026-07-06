@echo off
chcp 65001 >nul
setlocal
title 英语阅读刷题网站

cd /d "%~dp0"

if not exist "package.json" (
  echo [错误] 启动脚本不在正确的项目目录，未找到 package.json。
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 后再运行。
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 npm，请重新安装 Node.js 后再运行。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 首次启动，正在安装依赖……
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络或 npm 配置。
    pause
    exit /b 1
  )
)

echo.
echo 网站将在电脑上打开：http://localhost:5173
echo 手机访问：请连接同一 Wi-Fi，并打开下方 Vite 输出中的 Network 地址。
echo 首次出现防火墙提示时，请允许 Node.js 使用专用网络。
echo 按 Ctrl+C 或关闭本窗口即可停止网站。
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5173'"
call npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo 网站已停止或启动失败，退出代码：%EXIT_CODE%
pause
exit /b %EXIT_CODE%
