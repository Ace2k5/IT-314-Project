from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import callAPI
from backend import logger
from io import StringIO

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stringIO = StringIO()
logger.setup_log(stringIO)

callAPI.weather_coroutes(app)
callAPI.check_status(app)
callAPI.process_log(app, stringIO)
