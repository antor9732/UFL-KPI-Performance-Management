@echo off
title Stop Utah Fashion Ltd. KPI Server
color 0c

echo Stopping Utah Fashion Ltd. local KPI server...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Terminating server process PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo Server stopped cleanly.
timeout /t 2 /nobreak >nul
