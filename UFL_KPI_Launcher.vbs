' Utah Fashion Ltd. - Silent 1-Click Desktop Launcher
' Launches local background server and opens dashboard with ZERO console popup

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverDir = currentDir & "\server"
publicDir = serverDir & "\public"

' Detect PHP binary
phpBin = "php"
If fso.FileExists(currentDir & "\runtime\php\php.exe") Then
    phpBin = currentDir & "\runtime\php\php.exe"
ElseIf fso.FileExists("D:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe") Then
    phpBin = "D:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe"
ElseIf fso.FileExists("C:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe") Then
    phpBin = "C:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe"
End If

' Launch PHP background server with window hidden (0 = hide window)
WshShell.CurrentDirectory = serverDir
cmdString = """" & phpBin & """ -S 127.0.0.1:8000 -t """ & publicDir & """"
WshShell.Run cmdString, 0, False

' Wait 2 seconds for server socket initialization
WScript.Sleep 2000

' Open application in default web browser
WshShell.Run "http://127.0.0.1:8000"
