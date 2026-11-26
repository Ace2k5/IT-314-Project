"""Road routing through OSRM.

The browser never calls the routing service directly: this backend endpoint
fetches the road-following path and returns a compact list of points for the
frontend's polyline. Two public OSRM hosts are tried, so a hiccup or rate limit
on one does not leave the map without a path.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger(__name__)

ROUTING_ENDPOINTS = (
    "https://router.project-osrm.org/route/v1/driving/{coordinates}",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/{coordinates}",
)

ROUTING_PARAMS = {"overview": "simplified", "geometries": "geojson"}


def _parse_route(payload: dict[str, Any]) -> dict[str, Any] | None:
    routes = payload.get("routes") or []
    if not routes:
        return None

    route = routes[0]
    geometry = route.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []
    if not coordinates:
        return None

    # OSRM orders points [longitude, latitude]; Leaflet wants [latitude, longitude].
    points = [
        [round(latitude, 6), round(longitude, 6)]
        for longitude, latitude in coordinates
    ]
    return {
        "coordinates": points,
        "distance_m": route.get("distance"),
        "duration_s": route.get("duration"),
    }


def fetch_route(
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
) -> dict[str, Any] | None:
    """Return the route's points plus distance/duration, or None on failure."""
    coordinates = f"{from_lon},{from_lat};{to_lon},{to_lat}"

    for endpoint in ROUTING_ENDPOINTS:
        url = endpoint.format(coordinates=coordinates)
        host = url.split("/")[2]
        try:
            response = httpx.get(url, params=ROUTING_PARAMS, timeout=10)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as error:
            log.error("[Routing] %s failed: %s", host, error)
            continue

        route = _parse_route(payload)
        if route is None:
            log.warning(
                "[Routing] %s found no route from %.4f, %.4f to %.4f, %.4f.",
                host,
                from_lat,
                from_lon,
                to_lat,
                to_lon,
            )
            continue

        log.info(
            "[Routing] %s returned a %s-point route (%.0f m, %.0f s).",
            host,
            len(route["coordinates"]),
            route["distance_m"] or 0,
            route["duration_s"] or 0,
        )
        return route

    return None
