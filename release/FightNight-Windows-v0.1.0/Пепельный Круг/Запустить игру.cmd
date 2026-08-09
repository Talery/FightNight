@echo off
chcp 65001 >nul
title Пепельный Круг

set "GAME_PACKAGE=%~dp0"

if not exist "%GAME_PACKAGE%game\index.html" (
  echo Не найдены файлы игры.
  echo Распакуйте архив полностью и запустите этот файл ещё раз.
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%GAME_PACKAGE%launcher\server.ps1" -GameRoot "%GAME_PACKAGE%game"

if errorlevel 1 (
  echo.
  echo Не удалось запустить игру. Сообщите разработчику текст ошибки выше.
  pause
)
