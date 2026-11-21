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
