@echo off
title Utah Fashion Ltd. - KPI Performance Management System
color 0b

echo =========================================================================
echo       UTAH FASHION LTD. - KPI PERFORMANCE MANAGEMENT SYSTEM
echo =========================================================================
echo.
echo [1/3] Checking environment & locating PHP runtime...

set PHP_BIN=php
if exist "%~dp0runtime\php\php.exe" (
    set PHP_BIN=%~dp0runtime\php\php.exe
) else if exist "D:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe" (
    set PHP_BIN=D:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe
) else if exist "C:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe" (
    set PHP_BIN=C:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe
)

echo Using PHP Binary: %PHP_BIN%

echo [2/3] Starting local application server on http://127.0.0.1:8000 ...
cd /d "%~dp0server"

start /b "" "%PHP_BIN%" -S 127.0.0.1:8000 -t public >nul 2>&1

timeout /t 2 /nobreak >nul

echo [3/3] Opening Utah Fashion Ltd. KPI Dashboard in browser...
start http://127.0.0.1:8000

echo.
echo =========================================================================
echo Application is running at: http://127.0.0.1:8000
echo LAN Access (for factory network): Share this PC's IP address with staff
echo Keep this window open while using the application.
echo To stop the system, run stop-ufl-kpi.bat or close this window.
echo =========================================================================
echo.
pause
