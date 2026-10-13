@echo off
rem Startet "Bingo auf Schatzsuche" mit einem kleinen lokalen Webserver und oeffnet den Browser.
rem Fuer andere Geraete im Netzwerk: "Spiel starten.cmd" -Lan
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" %*
