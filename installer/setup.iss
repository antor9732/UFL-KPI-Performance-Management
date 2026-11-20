; Inno Setup Script for Utah Fashion Ltd. - KPI Performance Management System
; Builds a standalone 1-click Windows installer (setup.exe) for client distribution

#define MyAppName "Utah Fashion Ltd. KPI System"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Utah Fashion Ltd."
#define MyAppURL "http://www.utahbd.com"
#define MyAppExeName "UFL_KPI_Launcher.vbs"

[Setup]
AppId={{6E8A91B4-37C2-4E51-8F0A-256218BAE92C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Utah Fashion Ltd\UFL KPI Performance Management
DefaultGroupName=Utah Fashion Ltd
DisableProgramGroupPage=yes
LicenseFile=
PrivilegesRequired=lowest
OutputDir=..\dist-installer
OutputBaseFilename=UFL_KPI_Performance_Setup_v1.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
; Server root files and folders
Source: "..\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "vendor\phpunit\*,tests\*,storage\logs\*.log"
; Client built assets (inside server/public)
Source: "..\server\public\*"; DestDir: "{app}\server\public"; Flags: ignoreversion recursesubdirs createallsubdirs
; Desktop launchers
Source: "..\start-ufl-kpi.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stop-ufl-kpi.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\UFL_KPI_Launcher.vbs"; DestDir: "{app}"; Flags: ignoreversion
; Pre-seeded standalone database
Source: "..\server\database\database.sqlite"; DestDir: "{app}\server\database"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Stop KPI Server"; Filename: "{app}\stop-ufl-kpi.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent
