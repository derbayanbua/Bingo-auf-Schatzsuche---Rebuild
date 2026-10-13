@echo off
rem Entwicklungsserver (Quellcode, automatisches Neuladen). Fuer das fertige Spiel: dist\Spiel starten.cmd
cd /d "%~dp0"
if not exist node_modules call npm install
start "" http://localhost:5173/
npx vite --host --port 5173
