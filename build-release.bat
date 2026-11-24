@echo off
rem ======================================================================
rem  Developer-only: rebuild everything needed for the client installer.
rem  Needs (developer PC only): Node/npm, PHP + Composer, Inno Setup 6.
rem  Client PCs need NONE of these.
rem ======================================================================
setlocal
cd /d "%~dp0"

echo [1/5] Building React client into server\public ...
pushd client
call npm ci || goto :error
call npm run build || goto :error
popd

echo [2/5] Installing production PHP libraries ...
pushd server
call composer install --no-dev --optimize-autoloader --no-interaction || goto :error

echo [3/5] Packing server\vendor.zip ...
if exist vendor.zip del /q vendor.zip
tar -a -c -f vendor.zip vendor || goto :error
popd

echo [4/5] Compiling UFL_KPI_App.exe ...
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" set CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe
"%CSC%" /nologo /target:winexe /optimize+ /win32icon:desktop\app.ico /out:UFL_KPI_App.exe /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll desktop\Launcher.cs || goto :error

echo [5/5] Building installer ...
set ISCC="%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if exist %ISCC% (
    %ISCC% installer\setup.iss || goto :error
    echo Installer created in dist-installer\
) else (
    echo Inno Setup 6 not found - open installer\setup.iss in Inno Setup and click Compile.
)
echo Done.
pause
exit /b 0

:error
echo BUILD FAILED.
pause
exit /b 1
