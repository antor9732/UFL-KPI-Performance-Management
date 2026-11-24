; KPI Performance System - Windows installer (NSIS)
; Installs like a normal desktop program: Start Menu + Desktop shortcut,
; listed in Settings > Apps (Add/Remove Programs) with a proper uninstaller.
; Per-user install, no admin rights needed. Build: makensis /DPAYLOAD=<staging dir> kpi-setup.nsi
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!define APPNAME     "KPI Performance System"
!define DISPLAYNAME "KPI Performance System"
!define COMPANY     "KPI Performance System"
!define VERSION     "2.0.0"
!define EXE         "KPI_System.exe"
!define UNINSTKEY   "Software\Microsoft\Windows\CurrentVersion\Uninstall\KPI_Performance_System"
!ifndef PAYLOAD
  !define PAYLOAD "..\..\pkg"
!endif

Name "${DISPLAYNAME}"
!ifndef OUTDIR
  !define OUTDIR "."
!endif
OutFile "${OUTDIR}\KPI_Performance_System_Setup_v${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\KPI Performance System"
InstallDirRegKey HKCU "${UNINSTKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${APPNAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${DISPLAYNAME}"
VIAddVersionKey "CompanyName" "${COMPANY}"
VIAddVersionKey "FileDescription" "${DISPLAYNAME} Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${COMPANY}"

!include "MUI2.nsh"
!include "LogicLib.nsh"

!define MUI_ICON   "${PAYLOAD}\app.ico"
!define MUI_UNICON "${PAYLOAD}\app.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Install ${DISPLAYNAME}"
!define MUI_WELCOMEPAGE_TEXT "This will install ${DISPLAYNAME} ${VERSION} on this computer.$\r$\n$\r$\nNo server, database or other software is required - everything is included.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Open ${DISPLAYNAME} now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Function StopRunningApp
  ; Closing the launcher also stops its PHP server (Windows job object)
  nsExec::Exec 'taskkill /im ${EXE} /f'
  Sleep 1500
FunctionEnd

Function un.StopRunningApp
  nsExec::Exec 'taskkill /im ${EXE} /f'
  Sleep 1500
FunctionEnd

Section "Install"
  Call StopRunningApp
  SetOutPath "$INSTDIR"
  SetOverwrite on

  ; Remove old program code (never the data) so updates are clean
  RMDir /r "$INSTDIR\server\vendor"
  RMDir /r "$INSTDIR\server\public\assets"
  Delete "$INSTDIR\server\bootstrap\cache\*.php"

  File "${PAYLOAD}\${EXE}"
  File "${PAYLOAD}\app.ico"
  File /r "${PAYLOAD}\runtime"
  File /r "${PAYLOAD}\server"

  ; Seed database: only on first install - updates keep the client's data
  SetOutPath "$INSTDIR\server\database"
  SetOverwrite off
  File "/oname=database.sqlite" "${PAYLOAD}\server\database\seed.sqlite"
  SetOutPath "$INSTDIR"

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${DISPLAYNAME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\app.ico"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\${DISPLAYNAME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\app.ico"

  ; Settings > Apps entry
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayName"     "${DISPLAYNAME}"
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayVersion"  "${VERSION}"
  WriteRegStr   HKCU "${UNINSTKEY}" "Publisher"       "${COMPANY}"
  WriteRegStr   HKCU "${UNINSTKEY}" "DisplayIcon"     "$INSTDIR\app.ico"
  WriteRegStr   HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr   HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr   HKCU "${UNINSTKEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" 400000
SectionEnd

Section "Uninstall"
  Call un.StopRunningApp

  ; Shortcuts + Settings > Apps entry
  Delete "$DESKTOP\${DISPLAYNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\${DISPLAYNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk"
  RMDir  "$SMPROGRAMS\${APPNAME}"
  DeleteRegKey HKCU "${UNINSTKEY}"

  ; App window profile (Edge app mode)
  RMDir /r "$LOCALAPPDATA\KPI Performance System"

  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 \
    "Also delete all KPI data (database and uploaded photos)?$\r$\n$\r$\nChoose No to keep the data, so it comes back if you install again." \
    /SD IDNO IDYES delete_all

  ; Keep data: remove everything except server\database (KPI data) and server\storage\app (uploaded photos)
  RMDir /r "$INSTDIR\runtime"
  RMDir /r "$INSTDIR\server\vendor"
  RMDir /r "$INSTDIR\server\app"
  RMDir /r "$INSTDIR\server\bootstrap"
  RMDir /r "$INSTDIR\server\config"
  RMDir /r "$INSTDIR\server\public"
  RMDir /r "$INSTDIR\server\routes"
  RMDir /r "$INSTDIR\server\scripts"
  RMDir /r "$INSTDIR\server\storage\framework"
  RMDir /r "$INSTDIR\server\storage\logs"
  RMDir /r "$INSTDIR\server\storage\app\temp"
  RMDir /r "$INSTDIR\server\database\migrations"
  RMDir /r "$INSTDIR\server\database\seeders"
  RMDir /r "$INSTDIR\server\database\factories"
  RMDir /r "$INSTDIR\server\database\data"
  Delete "$INSTDIR\server\*.*"
  Delete "$INSTDIR\${EXE}"
  Delete "$INSTDIR\app.ico"
  Delete "$INSTDIR\Uninstall.exe"
  Goto done

  delete_all:
  RMDir /r "$INSTDIR"

  done:
SectionEnd
