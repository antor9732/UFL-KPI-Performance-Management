@echo off
rem ======================================================================
rem  Developer-only: builds dist-installer\KPI_Performance_System_Setup.exe
rem  Needs on the developer PC: Node/npm, PHP 8.4 + Composer, NSIS 3
rem  (https://nsis.sourceforge.io). Client PCs need NONE of these.
rem ======================================================================
setlocal
cd /d "%~dp0"

echo [1/6] Building the app screens into server\public ...
pushd client
call npm ci || goto :error
call npm run build || goto :error
popd

echo [2/6] Production PHP libraries ...
pushd server
call composer install --no-dev --optimize-autoloader --no-interaction || goto :error

echo [3/6] PowerPoint engine bundle ...
call npm ci --ignore-scripts || goto :error
call npx --yes esbuild scripts\generate_presentation.js --bundle --platform=node --target=node18 --format=cjs --outfile=scripts\generate_presentation.bundle.cjs || goto :error
popd

echo [4/6] Compiling KPI_System.exe ...
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
"%CSC%" /nologo /target:winexe /optimize+ /win32icon:desktop\app.ico /out:KPI_System.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll desktop\Launcher.cs || goto :error

echo [5/6] Collecting installer files ...
set STAGE=%~dp0dist-staging
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
copy /y KPI_System.exe "%STAGE%\" >nul
copy /y desktop\app.ico "%STAGE%\" >nul
robocopy runtime "%STAGE%\runtime" /e /xd dev /xf *.lib >nul
robocopy server "%STAGE%\server" /e /xd node_modules tests .git storage /xf .env database.sqlite vendor.zip .phpunit.result.cache >nul
robocopy server\storage "%STAGE%\server\storage" .gitignore /s >nul

echo [6/6] Building the installer ...
set MAKENSIS="%ProgramFiles(x86)%\NSIS\makensis.exe"
if not exist %MAKENSIS% set MAKENSIS="%ProgramFiles%\NSIS\makensis.exe"
if not exist %MAKENSIS% (
    echo NSIS not found. Install NSIS 3 and run this again.
    goto :error
)
if not exist dist-installer mkdir dist-installer
%MAKENSIS% /DPAYLOAD="%STAGE%" /DOUTDIR="%~dp0dist-installer" installer\kpi-setup.nsi || goto :error
echo Installer created in dist-installer\
pause
exit /b 0

:error
echo BUILD FAILED.
pause
exit /b 1
