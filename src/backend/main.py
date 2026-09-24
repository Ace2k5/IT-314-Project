from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import callAPI

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

callAPI.weather_coroutes(app)
callAPI.check_status(app)
