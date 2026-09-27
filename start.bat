@echo off
cd /d "%~dp0\src\backend"
start "Backend -- Uvicorn" cmd /k "uv run uvicorn main:app --reload --port 9999"

cd /d "%~dp0\src\WebSys"
start "Frontend -- Vite Server" cmd /k "npm run dev"

exit