; Inno Setup Script for Utah Fashion Ltd. - KPI Performance Management System
; Builds a standalone 1-click Windows installer (setup.exe) for client PCs.
; The client does NOT need PHP, Node.js, Laragon/XAMPP, MySQL or any server:
; everything (portable PHP + Node + SQLite database) is inside the install folder.
;
; Before compiling, the project root must contain:
;   UFL_KPI_App.exe              (desktop launcher, source: desktop\Launcher.cs)
;   runtime\php\php.exe, runtime\node\node.exe
;   server\vendor.zip            (PHP libraries; unpacked by the launcher on first run)
;   server\ufl_kpi_db            (pre-seeded SQLite database)
;   server\public\index.html + server\public\assets\*  (built client)

#define MyAppName "Utah Fashion Ltd. KPI System"
#define MyAppVersion "1.0.1"
#define MyAppPublisher "Utah Fashion Ltd."
#define MyAppURL "http://www.utahbd.com"
#define MyAppExeName "UFL_KPI_App.exe"

[Setup]
AppId={{6E8A91B4-37C2-4E51-8F0A-256218BAE92C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
; Per-user install (no admin needed). {autopf} becomes %LOCALAPPDATA%\Programs,
; which is writable -> SQLite database, uploads and logs work without admin rights.
PrivilegesRequired=lowest
DefaultDirName={autopf}\Utah Fashion Ltd\UFL KPI Performance Management
DefaultGroupName=Utah Fashion Ltd
DisableProgramGroupPage=yes
OutputDir=..\dist-installer
OutputBaseFilename=UFL_KPI_Performance_Setup_v{#MyAppVersion}
SetupIconFile=..\desktop\app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Setup refuses to continue while the app is running (same mutex as the launcher)
AppMutex=UFL_KPI_App_Mutex
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Portable runtimes (PHP 8.4 + Node.js)
Source: "..\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "php\dev\*,php\*.lib"

; Laravel application. Never ship the developer's .env, local database, logs,
; sessions, caches, tests or an unpacked vendor folder (vendor.zip is shipped instead).
Source: "..\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "\vendor\*,\node_modules\*,\tests\*,\.env,\.phpunit.result.cache,\database\database.sqlite,\database\*.sqlite-journal,\storage\logs\*,\storage\framework\sessions\*,\storage\framework\cache\data\*,\storage\framework\views\*,\storage\app\temp\*,\storage\app\public\avatars\*,\storage\app\desktop_port.txt,\bootstrap\cache\*.php,\public\storage"

; Pre-seeded database: installed ONCE. Upgrades/reinstalls never overwrite
; the client's live data, and uninstall keeps it.
Source: "..\server\ufl_kpi_db"; DestDir: "{app}\server\database"; DestName: "database.sqlite"; Flags: onlyifdoesntexist uninsneveruninstall

; Desktop launchers
Source: "..\UFL_KPI_App.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\desktop\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-ufl-kpi.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stop-ufl-kpi.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\UFL_KPI_Launcher.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\server\storage\app\public\avatars"; Flags: uninsneveruninstall
Name: "{app}\server\storage\logs"
Name: "{app}\server\storage\framework\cache\data"
Name: "{app}\server\storage\framework\sessions"
Name: "{app}\server\storage\framework\views"
Name: "{app}\server\bootstrap\cache"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Stop KPI Server"; Filename: "{app}\stop-ufl-kpi.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/im {#MyAppExeName} /f"; Flags: runhidden; RunOnceId: "StopUflKpi"

[UninstallDelete]
; Files created at runtime by the launcher (not tracked by the installer).
; database\database.sqlite, server\.env and uploaded photos are intentionally kept.
Type: filesandordirs; Name: "{app}\server\vendor"
Type: filesandordirs; Name: "{app}\server\vendor_tmp"
Type: filesandordirs; Name: "{app}\server\bootstrap\cache"
Type: filesandordirs; Name: "{app}\server\storage\framework"
Type: filesandordirs; Name: "{app}\server\storage\logs"
Type: filesandordirs; Name: "{app}\server\storage\app\temp"
Type: files; Name: "{app}\server\storage\app\desktop_port.txt"
