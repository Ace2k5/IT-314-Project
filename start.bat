@echo off
cd /d "%~dp0\src\backend"
start "" uv run uvicorn main:app --reload --port 9999

cd /d "%~dp0\src\WebSys"
npm run dev
pause