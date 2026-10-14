@echo off
rem Originaldateien von "Bingo auf Schatzsuche" fuer das private Heimspiel laden.
rem Nur fuer Besitzer des Originals - die erzeugten Dateien niemals weitergeben!
rem Beispiel:  "Originaldateien importieren.cmd" -Quelle E:\
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Originaldateien-importieren.ps1" %*
set RC=%ERRORLEVEL%
echo.
pause
exit /b %RC%
