@echo off
rem Startet das Spiel so, dass auch Handy, Tablet oder andere PCs im gleichen (W)LAN es oeffnen koennen.
rem Keine Administratorrechte noetig. Die Windows-Firewall fragt beim ersten Mal evtl. nach: "Zugriff zulassen" (privates Netzwerk).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Lan %*
