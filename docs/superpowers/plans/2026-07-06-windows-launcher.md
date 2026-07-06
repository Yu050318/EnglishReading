# Windows One-Click Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a double-clickable Windows batch file that safely starts the Vite site on port 5173 for both computer and same-Wi-Fi phone access.

**Architecture:** Keep the launcher self-contained at the repository root and resolve the project path from `%~dp0`. Validate prerequisites before starting Vite, install dependencies only when absent, open the browser through a delayed background PowerShell command, and keep the foreground window attached to the Vite process.

**Tech Stack:** Windows batch, npm, Vite, PowerShell (browser-opening helper only)

---

### Task 1: Create the Windows launcher

**Files:**
- Create: `启动网站.bat`

- [ ] **Step 1: Create the launcher with prerequisite checks**

Create `启动网站.bat` as UTF-8 with this behavior and structure:

```bat
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
```

- [ ] **Step 2: Add one-time dependency installation**

Append:

```bat
if not exist "node_modules" (
  echo 首次启动，正在安装依赖……
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络或 npm 配置。
    pause
    exit /b 1
  )
)
```

- [ ] **Step 3: Add browser opening and strict Vite startup**

Append:

```bat
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
```

Do not add absolute paths, administrator elevation, firewall commands, proxy changes, or new dependencies.

### Task 2: Document desktop and phone startup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a one-click Windows section**

Document:

```markdown
## Windows 一键启动

双击项目根目录的 `启动网站.bat`。首次运行会自动安装依赖，随后浏览器会打开 `http://localhost:5173`。

停止网站：在启动窗口按 `Ctrl+C`，或直接关闭窗口。

### 手机访问

1. 手机与电脑连接同一 Wi-Fi。
2. 双击 `启动网站.bat`。
3. 在手机浏览器打开启动窗口中 Vite 显示的 `Network` 地址，例如 `http://192.168.1.8:5173`。
4. Windows 防火墙首次询问时，允许 Node.js 使用专用网络。

手机不能使用 `localhost:5173`，因为手机上的 `localhost` 指向手机本身。
```

- [ ] **Step 2: Keep command-line startup instructions**

Retain the existing `npm run dev` instructions for users who prefer a terminal. Do not remove data conversion, testing, build, deployment, or backup documentation.

### Task 3: Validate the launcher without polluting the machine

**Files:**
- Verify: `启动网站.bat`
- Verify: `README.md`

- [ ] **Step 1: Run static launcher checks**

Use `Select-String` to verify the launcher contains all required tokens:

```powershell
$required = @('%~dp0','where node','where npm','if not exist "node_modules"','call npm install','--host 0.0.0.0','--port 5173','--strictPort','http://localhost:5173')
$content = Get-Content -Raw -Encoding utf8 '.\启动网站.bat'
$missing = $required | Where-Object { -not $content.Contains($_) }
if ($missing) { throw "启动脚本缺少: $($missing -join ', ')" }
```

Expected: command exits successfully with no missing tokens.

- [ ] **Step 2: Verify no machine-specific paths or privileged changes**

Run:

```powershell
Select-String -Path '.\启动网站.bat' -Pattern 'D:\\|C:\\|runas|netsh|git config|http\.proxy|https\.proxy'
```

Expected: no matches.

- [ ] **Step 3: Perform a controlled launch smoke test**

With port 5173 free and existing `node_modules`, start the batch file in a child process, wait until `http://127.0.0.1:5173/` returns HTTP 200, confirm `http://127.0.0.1:5173/questions.json` returns HTTP 200, then stop only the child process tree created for this test. Do not terminate unrelated Node processes.

- [ ] **Step 4: Verify strict-port failure**

While the controlled server owns 5173, start a second launcher instance and confirm its Vite process exits with a port-in-use error instead of selecting another port. Close the second paused window after capturing the result.

### Task 4: Combined release verification

**Files:**
- Include: `启动网站.bat`
- Include: `README.md`
- Include: `docs/superpowers/specs/2026-07-06-windows-launcher-design.md`
- Include: `docs/superpowers/plans/2026-07-06-windows-launcher.md`
- Also verify and finish: files listed in `docs/superpowers/plans/2026-07-05-memorize-jump.md`

- [ ] **Step 1: Finish the rejected memorize-jump UI**

Before release verification, ensure `src/App.tsx` actually contains `jumpValue`, `jumpError`, `goToIndex`, `jump`, the `.memorize-jump` DOM, Enter handling, input arrow-key isolation, and global form-control filtering. Confirm with:

```powershell
rg -n "jumpValue|jumpError|goToIndex|const jump|memorize-jump|onKeyDown|tagName" src/App.tsx
```

Expected: every required implementation token appears in the component source.

- [ ] **Step 2: Run project verification**

Run `npm.cmd test`, `npm.cmd run validate:data`, `npm.cmd run build`, and `git diff --check`.

Expected: all tests pass, question data validates, Vite builds, and diff check reports no errors.

- [ ] **Step 3: Protect unrelated files**

Inspect `git status --short` and the staged file list. Do not modify or stage `tsconfig.json` or `.claude/`.

- [ ] **Step 4: Report for product acceptance**

Do not commit implementation before product acceptance. Report evidence for the eight memorize-jump acceptance criteria and eight launcher acceptance criteria, plus tests, build, smoke test, strict-port test, diff scope, and any browser/Windows limitations.

- [ ] **Step 5: Commit and push after acceptance**

After product acceptance, stage only approved files, commit with `feat: add question jump and Windows launcher`, push normally to `origin/main`, and verify local `HEAD`, upstream, and GitHub `refs/heads/main` hashes match. Never force-push.

