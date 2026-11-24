"""Application entry point: ``uv run uvicorn main:app --reload --port 9999``."""

from __future__ import annotations

import logging
from io import StringIO

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend import logger
from backend.api import routes, shelters
from backend.config import load_env_file
from backend.sql import db

FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Read the repository .env before anything looks at os.environ.
load_env_file()

# Every log record lands in this buffer, which POST /log returns to the frontend.
log_buffer = StringIO()
logger.setup_log(log_buffer)

log = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database = db.Database()
shelters.check_table(database)

routes.register_weather_routes(app)
routes.register_earthquake_routes(app, database)
routes.register_typhoon_routes(app, database)
routes.register_status_routes(app)
routes.register_log_routes(app, log_buffer)
routes.register_credential_routes(app, database)
routes.register_auth_routes(app, database)
routes.register_model_routes(app)
routes.register_chat_routes(app)
routes.register_shelter_routes(app, database)
routes.register_route_routes(app)

log.info("[Server started]")
