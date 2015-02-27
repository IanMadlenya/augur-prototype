#define MyAppName "Augur"
#define MyAppVersion "0.3.2"
#define MyAppPublisher "Augur Project"
#define MyAppURL "http://www.augur.net/"
#define MyAppExeName "augur.exe"
#define SourceDir "C:\Users\jack\Documents\Scripts\AugurProject\augur\dist\augur\"

[Setup]
AppId={{1CA950F0-C451-4688-9BC5-D25842578076}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile={#SourceDir}LICENSE.txt
OutputDir=install
OutputBaseFilename={#MyAppName}_{#MyAppVersion}
Compression=lzma
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 0,6.1

[Files]
Source: "{#SourceDir}augur.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}*.manifest"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}augur.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}augur_ctl"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}*.pyd"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}README.rst"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}core\*"; DestDir: "{app}\core"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}include\*"; DestDir: "{app}\include"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceDir}static\*"; DestDir: "{app}\static"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
