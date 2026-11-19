"""HTTP routes for the WebSys backend.

Every ``register_*`` function attaches one group of endpoints to the application
and receives the shared ``Database`` instance explicitly instead of reaching for
a global.
"""

from __future__ import annotations

import logging
from io import StringIO
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from backend import errors
from backend.api import stream_message, utilAPI
from backend.geography import locations
from backend.request_models import models
from backend.sql.db import Database

log = logging.getLogger(__name__)

WEATHER_CACHE_TTL_SECONDS = 180

# Open-Meteo WMO weather codes mapped to the icon set the frontend renders.
WEATHER_ICONS: dict[int, str] = {
    0: "sunny",
    1: "sunny",
    2: "cloudy",
    3: "cloudy",
    45: "cloudy",
    48: "cloudy",
    51: "rainy",
    53: "rainy",
    55: "rainy",
    56: "rainy",
    57: "rainy",
    61: "rainy",
    63: "rainy",
    65: "rainy",
    66: "rainy",
    67: "rainy",
    71: "snowy",
    73: "snowy",
    75: "snowy",
    77: "snowy",
    80: "rainy",
    81: "rainy",
    82: "rainy",
    85: "snowy",
    86: "snowy",
    95: "stormy",
    96: "stormy",
    97: "stormy",
    99: "stormy",
}

weather_city_cache: dict[str, dict[str, Any]] = {}
weather_region_cache: dict[str, dict[str, Any]] = {}


def _fetch_weather(positions: dict[str, dict[str, float]]) -> dict[str, dict[str, Any]]:
    """Fetch the current weather for every position, skipping the ones that fail."""
    log.info("[Weather] Refreshing %s location(s)", len(positions))
    results: dict[str, dict[str, Any]] = {}

    for name, position in positions.items():
        url = utilAPI.build_open_meteo_url(position)
        try:
            response = httpx.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            current = data["current"]
        except (httpx.HTTPError, ValueError, KeyError) as error:
            log.error("[Weather] Could not read the weather for %s: %s", name, error)
            continue

        results[name] = {
            "latitude": position["latitude"],
            "longitude": position["longitude"],
            "temperature": current["temperature_2m"],
            "temperature_unit": data["current_units"]["temperature_2m"],
            "weather": current["weather_code"],
            "weather_icon": WEATHER_ICONS.get(current["weather_code"], "sunny"),
        }

    return results


def register_weather_routes(app: FastAPI) -> None:
    @app.get("/weather/high")
    def get_weather_cities() -> dict[str, dict[str, Any]]:
        """Detailed weather for each city; the map shows this when zoomed in."""
        global weather_city_cache
        if utilAPI.is_stale("weather_high", WEATHER_CACHE_TTL_SECONDS):
            weather_city_cache = _fetch_weather(locations.LOCATIONS)
            utilAPI.mark_refreshed("weather_high")
        return weather_city_cache

    @app.get("/weather/low")
    def get_weather_region() -> dict[str, dict[str, Any]]:
        """A single regional reading; the map shows this when zoomed out."""
        global weather_region_cache
        if utilAPI.is_stale("weather_low", WEATHER_CACHE_TTL_SECONDS):
            weather_region_cache = _fetch_weather(locations.REGIONS)
            utilAPI.mark_refreshed("weather_low")
        return weather_region_cache


def register_earthquake_routes(app: FastAPI, database: Database) -> None:
    @app.post("/weather/earthquake")
    def get_earthquakes(request: models.EarthquakeDateRequest) -> list[dict[str, Any]]:
        log.info("[Earthquake] Looking for %s-%s-%s", request.year, request.month, request.day)
        events = utilAPI.call_gdacs_earthquake(request.year, request.month, request.day, database)
        if not events:
            log.info("[Earthquake] No events for the requested date.")
            return []
        return events


def register_status_routes(app: FastAPI) -> None:
    @app.get("/status")
    def get_status() -> dict[str, str]:
        return {"text": "Connection Successful"}


def register_shelter_routes(app: FastAPI, database: Database) -> None:
    @app.get("/shelters")
    def get_shelters() -> dict[int, dict[str, Any]] | None:
        shelters = utilAPI.get_shelters(database)
        if not shelters:
            log.info("[Shelters] No evacuation centres are stored yet.")
        return shelters


def register_log_routes(app: FastAPI, log_buffer: StringIO) -> None:
    @app.post("/log")
    def post_log(request: models.LogMessage) -> dict[str, str]:
        try:
            if request.message:
                log.info(request.message)
            return {"logs": log_buffer.getvalue()}
        except Exception as error:  # noqa: BLE001 - reported to the client as 500
            raise errors.ProcessingError("Could not read the in-memory log buffer.") from error


def register_credential_routes(app: FastAPI, database: Database) -> None:
    @app.post("/api/save")
    def save_credentials(credentials: models.Credentials) -> dict[str, Any]:
        # TODO(user profiles): persist against an authenticated user instead of
        # keeping the key in the browser for the lifetime of the tab.
        log.info("[Credentials] Save requested for %s", credentials.api)
        return {"saved": False, "reason": "User profiles are not implemented yet."}


def register_model_routes(app: FastAPI) -> None:
    @app.post("/models")
    def get_models(credentials: models.Credentials) -> list[dict[str, Any]]:
        endpoint = credentials.api.rstrip("/")
        try:
            response = httpx.get(f"{endpoint}/v1/models", timeout=10)
        except httpx.HTTPError as error:
            log.error("[Models] Could not reach %s: %s", endpoint, error)
            return []

        if not response.is_success:
            log.error("[Models] %s answered with status %s", endpoint, response.status_code)
            return []

        try:
            payload = response.json()
        except ValueError:
            log.error("[Models] %s returned unreadable JSON", endpoint)
            return []

        data = payload.get("data", []) if isinstance(payload, dict) else []
        log.info("[Models] Returning %s model(s) for %s", len(data), endpoint)
        return data


def register_chat_routes(app: FastAPI) -> None:
    @app.post("/chat/completions")
    async def chat_completions(request: models.ChatRequest):
        base_url = request.api.rstrip("/")
        url = f"{base_url}/v1/chat/completions"
        log.info("[Chat] Proxying to %s using %s", url, request.selected_model)

        payload: dict[str, Any] = {
            "model": request.selected_model,
            "messages": [message.model_dump() for message in request.history],
            "stream": True,
            "tools": [{
                "type": "function",
                "function": {
                    "name": stream_message.SEARCH_TOOL_NAME,
                    "description": "Search the web for current news and information.",
                    "parameters": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                        "required": ["query"],
                    },
                },
            }],
        }

        headers = {"Content-Type": "application/json"}
        if request.key:
            headers["Authorization"] = f"Bearer {request.key}"

        return StreamingResponse(
            stream_message.event_generator(request, url, payload, headers),
            media_type="text/event-stream",
        )
