"""HTTP routes for the WebSys backend.

Every ``register_*`` function attaches one group of endpoints to the application
and receives the shared ``Database`` instance explicitly instead of reaching for
a global.
"""

from __future__ import annotations

import logging
import math
from io import StringIO
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import datetime

from backend import errors
from backend.api import earthquake, stream_message, util, weather, shelters, typhoon
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

weather_cache: dict[str, dict[str, Any]] = {}


def _fetch_weather(positions: dict[str, dict[str, float]]) -> dict[str, dict[str, Any]]:
    """Fetch every position in a single Open-Meteo call.

    The API answers with an array in request order, tagging each entry with its
    index in ``location_id`` (the first entry omits it). Map the readings back by
    that index, never by coordinate: the API snaps coordinates to its grid, so
    several nearby cities can come back with identical values.
    """
    if not positions:
        return {}

    names = list(positions)
    url = weather.build_open_meteo_url(list(positions.values()))

    try:
        response = httpx.get(url, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError) as error:
        log.error("[Weather] The Open-Meteo call failed: %s", error)
        return {}

    readings = payload if isinstance(payload, list) else [payload]
    results: dict[str, dict[str, Any]] = {}

    for reading in readings:
        if not isinstance(reading, dict):
            continue

        index = reading.get("location_id", 0)
        if not isinstance(index, int) or not 0 <= index < len(names):
            log.warning("[Weather] Skipped a reading with an unexpected location_id: %r", index)
            continue

        current = reading.get("current") or {}
        if "temperature_2m" not in current:
            log.warning("[Weather] No current reading for %s", names[index])
            continue

        name = names[index]
        position = positions[name]
        results[name] = {
            # Keep the requested coordinates so the marker sits on the city,
            # not on the grid cell Open-Meteo snapped it to.
            "latitude": position["latitude"],
            "longitude": position["longitude"],
            "temperature": current["temperature_2m"],
            "temperature_unit": (reading.get("current_units") or {}).get("temperature_2m", "°C"),
            "weather": current["weather_code"],
            "weather_icon": WEATHER_ICONS.get(current["weather_code"], "sunny"),
        }
    log.info("[Weather] Used %s of %s reading(s) from a single call.", len(results), len(names))
    return results


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def register_weather_routes(app: FastAPI) -> None:
    @app.get("/weather")
    def get_weather_cities() -> dict[str, dict[str, Any]]:
        """Detailed weather for each city; the map shows this when zoomed in."""
        global weather_cache
        if util.is_stale("weather_high", WEATHER_CACHE_TTL_SECONDS):
            weather_cache = _fetch_weather(locations.LOCATIONS)
            util.mark_refreshed("weather_high")
        return weather_cache

    @app.get("/weather/location")
    def get_location_forecast(latitude: float, longitude: float) -> dict[str, Any]:
        """Current conditions plus today and four forecast days for one point."""
        url = weather.build_location_forecast_url(latitude, longitude)
        try:
            response = httpx.get(url, timeout=10)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as error:
            log.error("[Weather] The location forecast call failed: %s", error)
            return {}

        current = payload.get("current") or {}
        units = payload.get("current_units") or {}
        daily = payload.get("daily") or {}

        if current.get("temperature_2m") is None:
            log.warning("[Weather] The location forecast had no current temperature.")
            return {}

        dates = daily.get("time") or []
        codes = daily.get("weather_code") or []
        maxima = daily.get("temperature_2m_max") or []
        minima = daily.get("temperature_2m_min") or []

        days = [
            {
                "date": date,
                "weather": code,
                "weather_icon": WEATHER_ICONS.get(code, "sunny"),
                "temperature_max": maximum,
                "temperature_min": minimum,
            }
            for date, code, maximum, minimum in zip(dates, codes, maxima, minima)
        ]

        nearest_city: str | None = None
        nearest_distance: float | None = None
        for name, position in locations.LOCATIONS.items():
            distance = _haversine_km(
                latitude,
                longitude,
                position["latitude"],
                position["longitude"],
            )
            if nearest_distance is None or distance < nearest_distance:
                nearest_city = name
                nearest_distance = distance

        # Only label the place when the user is actually near a known city.
        if nearest_distance is not None and nearest_distance > 50:
            nearest_city = None

        log.info("[Weather] Built a %s-day forecast for %.4f, %.4f.", len(days), latitude, longitude)
        return {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": payload.get("timezone"),
            "place": nearest_city,
            "current": {
                "temperature": current["temperature_2m"],
                "temperature_unit": units.get("temperature_2m", "°C"),
                "weather": current.get("weather_code"),
                "weather_icon": WEATHER_ICONS.get(current.get("weather_code"), "sunny"),
            },
            "daily": days,
        }

def register_earthquake_routes(app: FastAPI, database: Database) -> None:
    @app.get("/weather/earthquake")
    def get_earthquakes() -> list[dict[str, Any]]:
        now = datetime.datetime.now()
        initial_date = now.replace(year=1980, month=1, day=1, hour=0, minute=0, second=0)
        log.info("[Earthquake] Finding all Earthquakes from %s to %r", initial_date, now)
        events = earthquake.call_gdacs_earthquake(database)
        if not events:
            log.info("[Earthquake] No events for the requested date.")
            return []
        return events
    
def register_typhoon_routes(app: FastAPI, database: Database) -> None:
    @app.get("/weather/typhoon")
    def get_typhoon() -> list[dict[str, Any]]:
        now = datetime.datetime.now()
        initial_date = now.replace(year=1980, month=1, day=1, hour=0, minute=0, second=0)
        log.info("[Earthquake] Finding all Earthquakes from %s to %r", initial_date, now)
        events = typhoon.call_gdacs_typhoon(database)
        if not events:
            log.info("[Typhoon] No events for requested data.")
            return []
        return events


def register_status_routes(app: FastAPI) -> None:
    @app.get("/status")
    def get_status() -> dict[str, str]:
        return {"text": "Connection Successful"}


def register_shelter_routes(app: FastAPI, database: Database) -> None:
    @app.get("/shelters")
    def get_shelters() -> dict[int, dict[str, Any]] | None:
        shelter = shelters.get_shelters(database)
        if not shelter:
            log.info("[Shelters] No evacuation centres are stored yet.")
        return shelter


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


def register_auth_routes(app: FastAPI, database: Database) -> None:
    @app.post("/auth/register")
    def register_user(request: models.RegisterRequest) -> dict[str, Any]:
        import hashlib
        hashed = hashlib.sha256(request.password.encode()).hexdigest()
        try:
            database.cursor.execute(
                "INSERT INTO Users (username, password, api, api_key, search_key) VALUES (?, ?, ?, ?, ?)",
                (request.username, hashed, request.api, request.api_key, request.search_key),
            )
            database.connection.commit()
            return {"success": True}
        except Exception:
            database.connection.rollback()
            return {"success": False, "error": "Username already taken."}

    @app.post("/auth/login")
    def login_user(request: models.LoginRequest) -> dict[str, Any]:
        import hashlib
        hashed = hashlib.sha256(request.password.encode()).hexdigest()
        database.cursor.execute(
            "SELECT id, username, api, api_key, search_key FROM Users WHERE username = ? AND password = ?",
            (request.username, hashed),
        )
        row = database.cursor.fetchone()
        if not row:
            return {"success": False, "error": "Invalid username or password."}
        return {
            "success": True,
            "username": row["username"],
            "api": row["api"],
            "api_key": row["api_key"],
            "search_key": row["search_key"],
        }

    @app.get("/auth/me")
    def get_current_user(username: str) -> dict[str, Any] | None:
        database.cursor.execute(
            "SELECT username, api, api_key, search_key FROM Users WHERE username = ?",
            (username,),
        )
        row = database.cursor.fetchone()
        if not row:
            return None
        return {
            "username": row["username"],
            "api": row["api"],
            "api_key": row["api_key"],
            "search_key": row["search_key"],
        }


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


if __name__ == "__main__":
    from backend import logger
    from io import StringIO
    logger.setup_log(StringIO())
    from backend.geography import locations
    from pprint import pprint
    locations = locations.LOCATIONS
    pprint(_fetch_weather(locations))