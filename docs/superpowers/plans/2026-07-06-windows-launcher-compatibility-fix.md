# Windows Launcher Compatibility Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `启动网站.bat` parse reliably in Windows `cmd.exe` while preserving all launcher behavior.

**Architecture:** Remove all non-ASCII batch content and enforce Windows CRLF checkout through `.gitattributes`. Verify both the prerequisite failure path and a real Vite launch before product acceptance.

**Tech Stack:** Windows batch, Git attributes, npm, Vite, PowerShell validation

---

### Task 1: Reproduce and lock the failure evidence

**Files:**
- Inspect: `启动网站.bat`

- [ ] Run the current script with `PATH` restricted to `C:\Windows\System32` and stdin redirected from null.
- [ ] Record that the broken version returns `9009` and emits fragmented `is not recognized` commands.
- [ ] Do not start Vite during this reproduction.

### Task 2: Make the batch file encoding-safe

**Files:**
- Modify: `启动网站.bat`
- Create or modify: `.gitattributes`

- [ ] Replace every Chinese title/message and non-ASCII punctuation in the batch body with ASCII English.
- [ ] Remove `chcp 65001`; retain `%~dp0`, all prerequisite checks, conditional `npm install`, delayed browser opening and the exact Vite arguments.
- [ ] Add `*.bat text eol=crlf` to `.gitattributes` without changing unrelated attribute rules.
- [ ] Verify the batch byte stream contains no byte greater than `0x7F`.
- [ ] Verify the working file uses CRLF before interactive testing.

Use this exact batch behavior:

```bat
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
```

### Task 3: Verify failure and success paths

**Files:**
- Verify: `启动网站.bat`

- [ ] Re-run the isolated-PATH prerequisite test. Expected: one clear Node-missing message, exit code 1, and zero `is not recognized` fragments.
- [ ] Run the launcher normally with `node_modules` present; confirm it does not execute `npm install`.
- [ ] Poll `http://127.0.0.1:5173/` and `/questions.json`; both must return 200.
- [ ] Start a second Vite instance with the same strict-port arguments; confirm `Port 5173 is already in use` and no alternate port.
- [ ] Stop only the test-created process tree and confirm `netstat` shows no listener on 5173.

### Task 4: Regression and handoff

**Files:**
- Include: `启动网站.bat`
- Include: `.gitattributes`
- Include: the compatibility spec and plan

- [ ] Run `npm.cmd test`, `npm.cmd run validate:data`, `npm.cmd run build`, and `git diff --check`.
- [ ] Inspect the exact diff. Do not stage or modify existing uncommitted changes in `src/`, `tsconfig.json` or `.claude/`.
- [ ] Report root-cause reproduction, fixed prerequisite path, HTTP smoke, strict-port result, process cleanup and regression results to product.
- [ ] Do not commit before product acceptance. After acceptance, commit only the four approved files with `fix: make Windows launcher cmd-compatible`, push normally, and verify HEAD/upstream/GitHub hashes match.
