import { useEffect, useState } from 'react'
import { Polyline, useMap } from 'react-leaflet'

import { backend } from '../../api/backendClient'
import { useAlertStore } from '../../stores/useAlertStore'
import { useLocationStore } from '../../stores/useLocationStore'
import { useRouteStore } from '../../stores/useRouteStore'

type RoutePoints = [number, number][]

type FetchedRoute = {
    key: string
    points: RoutePoints
}

/** Session cache so clicking the same destination again does not re-ask OSRM. */
const routeCache = new Map<string, RoutePoints>()

function cacheKey(
    targetId: string,
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
): string {
    return `${targetId}:${fromLat.toFixed(5)},${fromLon.toFixed(5)}:${toLat.toFixed(5)},${toLon.toFixed(5)}`
}

/** Draws the road path to the marker the user selected. */
export function RouteLayer() {
    const map = useMap()
    const coords = useLocationStore((state) => state.coords)
    const alert = useAlertStore((state) => state.alert)
    const target = useRouteStore((state) => state.target)
    // During a simulated alert without a stored location, start from the
    // simulated hazard so the demo can still draw the evacuation route.
    const origin = coords ?? alert?.origin ?? null
    const [fetched, setFetched] = useState<FetchedRoute | null>(null)

    const key =
        origin && target
            ? cacheKey(
                  target.id,
                  origin.latitude,
                  origin.longitude,
                  target.latitude,
                  target.longitude,
              )
            : null

    // Derive the visible path instead of clearing state from an effect.
    const points = key
        ? (routeCache.get(key) ?? (fetched?.key === key ? fetched.points : null))
        : null

    useEffect(() => {
        if (!key || !origin || !target) return
        if (routeCache.has(key)) return

        let cancelled = false
        void backend
            .getRoute(origin.latitude, origin.longitude, target.latitude, target.longitude)
            .then((route) => {
                if (cancelled || !route) return
                routeCache.set(key, route.coordinates)
                setFetched({ key, points: route.coordinates })
            })

        return () => {
            cancelled = true
        }
    }, [key, origin, target])

    useEffect(() => {
        if (!points || points.length < 2) return
        // Bring the whole path into view; at country zoom a local route is only
        // a couple of pixels long.
        map.fitBounds(points, { padding: [60, 60], maxZoom: 15 })
    }, [map, points])

    if (!points) return null

    return (
        <>
            <Polyline
                positions={points}
                pathOptions={{
                    color: 'white',
                    weight: 7,
                    opacity: 0.85,
                    interactive: false,
                    className: 'route-path route-casing',
                }}
            />
            <Polyline
                positions={points}
                pathOptions={{
                    color: '#4f92f0',
                    weight: 4,
                    opacity: 0.95,
                    interactive: false,
                    className: 'route-path route-line',
                }}
            />
        </>
    )
}
