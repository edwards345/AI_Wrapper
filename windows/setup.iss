; AI Wrapper - Inno Setup Installer Script
; Compile with: Inno Setup 6+ (https://jrsoftware.org/isinfo.php)

#define MyAppName "AI Wrapper"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "AI Wrapper"
#define MyAppURL "https://github.com/edwards345/AI_Wrapper"
#define MyAppExeName "start-aiwrapper.bat"

[Setup]
AppId={{A1-WRAPPER-2024-MULTI-LLM}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\AIWrapper
DefaultGroupName={#MyAppName}
OutputDir=output
OutputBaseFilename=AIWrapper-Setup
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes
LicenseFile=..\LICENSE
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; App source (exclude node_modules, dist, .git, .env)
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Excludes: "node_modules,dist,.git,.env,*.map,AI_Wrapper,windows\output"
; Windows launcher and scripts
Source: "start-aiwrapper.bat"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "install-deps.bat"; DestDir: "{app}\windows"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\windows\start-aiwrapper.bat"; WorkingDir: "{app}"; IconFilename: "{app}\windows\icon.ico"; Comment: "Launch AI Wrapper"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\windows\start-aiwrapper.bat"; WorkingDir: "{app}"; IconFilename: "{app}\windows\icon.ico"; Comment: "Launch AI Wrapper"

[Run]
; Install Node.js if not present
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -Command ""if (-not (Get-Command node -ErrorAction SilentlyContinue)) {{ winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements }}"""; StatusMsg: "Checking for Node.js..."; Flags: runhidden waituntilterminated
; Install dependencies
Filename: "{app}\windows\install-deps.bat"; Parameters: ""; WorkingDir: "{app}"; StatusMsg: "Installing dependencies (this may take a minute)..."; Flags: runhidden waituntilterminated
; Configure API keys
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\setup-keys.ps1"""; StatusMsg: "Configure API keys..."; Flags: postinstall skipifsilent nowait
; Launch app
Filename: "{app}\windows\start-aiwrapper.bat"; Description: "Launch AI Wrapper now"; WorkingDir: "{app}"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\dist"
Type: filesandordirs; Name: "{app}\src\web\client\node_modules"
Type: filesandordirs; Name: "{app}\src\web\client\dist"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
