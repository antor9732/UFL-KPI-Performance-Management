@echo off
echo Stopping KPI Performance System...
taskkill /im KPI_System.exe /f >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rt = (Join-Path '%~dp0' 'runtime\php\php.exe');" ^
  "Get-Process php -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $rt } | Stop-Process -Force"
echo Stopped.
timeout /t 2 /nobreak >nul
