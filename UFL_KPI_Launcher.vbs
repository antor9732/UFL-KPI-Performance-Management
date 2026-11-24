' Utah Fashion Ltd. - Silent launcher
' Starts UFL_KPI_App.exe, which prepares and runs the local engine
' (bundled PHP + SQLite) and opens the dashboard in the default browser.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
appExe = currentDir & "\UFL_KPI_App.exe"

If fso.FileExists(appExe) Then
    WshShell.CurrentDirectory = currentDir
    WshShell.Run """" & appExe & """", 1, False
Else
    MsgBox "UFL_KPI_App.exe not found. Please reinstall the application.", 16, "UFL KPI System"
End If
