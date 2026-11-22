@echo off
cd /d "%~dp0"
uv sync

cd /d "%~dp0\src\WebSys"
npm install

echo === Dependencies installed ===
pause
