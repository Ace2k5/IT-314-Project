@echo off
cd /d "%~dp0"
start "Argus Search" cmd /k "call .venv\Scripts\activate.bat && argus serve --host 0.0.0.0 --port 9997"

cd /d "%~dp0\src\backend\mcp"
start "MCP Server" cmd /k "uv run fastmcp run mcp.py:mcp --transport http --port 9998"

cd /d "%~dp0\src\backend"
start "Backend -- Uvicorn" cmd /k "uv run uvicorn main:app --reload --port 9999"

cd /d "%~dp0\src\WebSys"
start "Frontend -- Vite Server" cmd /k "npm run dev"

exit