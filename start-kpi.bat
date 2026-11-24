@echo off
rem Starts the KPI Performance System (same as the desktop shortcut).
if not exist "%~dp0KPI_System.exe" (
    echo KPI_System.exe not found. Please reinstall the application.
    pause
    exit /b 1
)
start "" "%~dp0KPI_System.exe"
