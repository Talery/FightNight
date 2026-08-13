@echo off
setlocal
title FightNight - Ashen Ring

set "GAME_PACKAGE=%~dp0"

if not exist "%GAME_PACKAGE%game\index.html" (
  echo Game files were not found.
  echo Extract the whole ZIP archive first, then run PLAY.cmd again.
  echo.
  pause
  exit /b 1
)

set "LAUNCHER_OPTIONS="
if defined FIGHTNIGHT_TEST_PORT set "LAUNCHER_OPTIONS=-Port %FIGHTNIGHT_TEST_PORT% -NoBrowser"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%GAME_PACKAGE%launcher\server.ps1" -GameRoot "%GAME_PACKAGE%game" %LAUNCHER_OPTIONS%

if errorlevel 1 (
  echo.
  echo FightNight could not start. Send the error shown above to the developer.
  pause
)
