from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import callAPI
from backend import logger
from backend.mcp import mcp
from backend.sql import db
from io import StringIO
import logging
from fastmcp import Client
from contextlib import asynccontextmanager
import socket
import asyncio
import logging

log = logging.getLogger(__name__)

# wait specifically for mcp since it takes time to set up
async def wait_for_port(host: str, port: int, timeout: float = 30.0):
    start_time = asyncio.get_event_loop().time()
    while True:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                print(f"[MCP Client] Server is up on {host}:{port}!")
                return
        except (ConnectionRefusedError, OSError):
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError(f"MCP Server failed to start within {timeout} seconds")
            await asyncio.sleep(0.5)
            
@asynccontextmanager
async def lifespans(app: FastAPI):
    await wait_for_port("localhost", 9998)
    log.info("[Backend MCP Server] Connecting...")
    client = Client("http://localhost:9998/mcp")
    async with client:
        # proper connection with client, says to use async with client in async context manager.
        app.state.mcp_client = client
        app.state.openai_tools = await mcp.expose_tools(client)
        yield
    log.info("[Backend MCP Server] Disconnecting...")

app = FastAPI(lifespan=lifespans)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stringIO = StringIO()
logger.setup_log(stringIO)
database = db.Database()
log = logging.getLogger("__name__")
log.info("[Server started]")

callAPI.weather_coroutes(app)
callAPI.gdacs(app, database)
callAPI.check_status(app)
callAPI.process_log(app, stringIO)
callAPI.SaveApi(app, database)
callAPI.Get_Model(app)
callAPI.ChatCompletions(app)
