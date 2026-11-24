@echo off
title Stop Utah Fashion Ltd. KPI Server
echo Stopping Utah Fashion Ltd. KPI System...

rem Close the tray launcher (its PHP server is stopped with it)
taskkill /im UFL_KPI_App.exe /f >nul 2>&1

rem Stop only the PHP server that belongs to THIS installation
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rt = (Join-Path '%~dp0' 'runtime\php\php.exe');" ^
  "Get-Process php -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $rt } | Stop-Process -Force"

echo KPI System stopped.
timeout /t 2 /nobreak >nul
