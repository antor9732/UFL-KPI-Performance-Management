@echo off
title Utah Fashion Ltd. - KPI Performance Management System
rem All setup (libraries, .env/APP_KEY, database, free port, PHP runtime
rem options) is handled by UFL_KPI_App.exe, so this simply starts it.
if not exist "%~dp0UFL_KPI_App.exe" (
    echo UFL_KPI_App.exe not found. Please reinstall the application.
    pause
    exit /b 1
)
start "" "%~dp0UFL_KPI_App.exe"
