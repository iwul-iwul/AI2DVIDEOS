@echo off
title Reelhouse
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Reelhouse needs Node.js. Opening the download page: install the LTS version, then double-click this file again.
  start "" https://nodejs.org
  pause
  exit /b 1
)
node scripts\launch.mjs
pause
