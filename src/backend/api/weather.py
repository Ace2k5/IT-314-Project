import logging

log = logging.getLogger(__name__)


def build_open_meteo_url(positions: list[dict[str, float]]) -> str:
    latitudes = ",".join(str(position["latitude"]) for position in positions)
    longitudes = ",".join(str(position["longitude"]) for position in positions)
    log.info("[Backend OpenMeteo] Requesting %s location(s) in one call.", len(positions))
    return (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        "&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"
    )


def build_location_forecast_url(latitude: float, longitude: float) -> str:
    """Current conditions plus today and the next four days for one point."""
    log.info("[Backend OpenMeteo] Requesting a location forecast for %.4f, %.4f.", latitude, longitude)
    return (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}&longitude={longitude}"
        "&current=temperature_2m,weather_code"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min"
        "&timezone=auto&forecast_days=5"
    )
