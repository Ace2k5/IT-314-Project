import { useEffect, useMemo, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { getCityWeather, pickRegions } from '../../cache/weatherCache'
import type { WeatherEntry, WeatherMap } from '../../types/api'
import { useRouteStore } from '../../stores/useRouteStore'
import { escapeHtml } from '../../utils/escapeHtml'
import { WEATHER_ICONS, WEATHER_LABELS } from '../weather/weatherIcons'

/** Above this zoom the map shows every city; below it, one marker per region. */
export const DETAILED_ZOOM = 12

function createWeatherIcon(city: string, entry: WeatherEntry) {
    const icon = WEATHER_ICONS[entry.weatherIcon] ?? WEATHER_ICONS.sunny
    const temperature = `${Math.round(entry.temperature)}${entry.temperatureUnit}`
    return L.divIcon({
        className: 'weather-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -40],
        html: `<div class="marker-chip">
            <div class="marker-chip-body">
                <img class="marker-chip-icon" src="${icon}" alt="" />
                <span class="marker-chip-name">${escapeHtml(city)}</span>
                <span class="marker-chip-temp">${escapeHtml(temperature)}</span>
            </div>
        </div>`,
    })
}

/**
 * The weather markers, rendered inside `MapContainer`.
 *
 * Reading the zoom from the map itself keeps the state here instead of pushing
 * it back up to `MapView` through a callback prop.
 */
export function WeatherLayer() {
    const map = useMap()
    const [zoom, setZoom] = useState(() => map.getZoom())
    // An empty map means "no data yet", so this never needs a null check.
    const [weather, setWeather] = useState<WeatherMap>({})
    const setRouteTarget = useRouteStore((state) => state.setTarget)
    const clearRouteTarget = useRouteStore((state) => state.clearTarget)

    useMapEvents({
        zoomend: (event) => setZoom(event.target.getZoom()),
    })

    useEffect(() => {
        let cancelled = false

        void (async () => {
            const cities = await getCityWeather()
            if (cancelled) return
            setWeather(cities)
        })()

        return () => {
            cancelled = true
        }
    }, [])

    // Icons only change when the weather data changes, not on a zoom re-render.
    const icons = useMemo(() => {
        const cached = new Map<string, L.DivIcon>()
        for (const [city, entry] of Object.entries(weather)) {
            cached.set(city, createWeatherIcon(city, entry))
        }
        return cached
    }, [weather])

    const visible = zoom >= DETAILED_ZOOM ? weather : pickRegions(weather)

    return (
        <>
            {Object.entries(visible).map(([city, entry]) => (
                <Marker
                    key={city}
                    position={[entry.latitude, entry.longitude]}
                    icon={icons.get(city)}
                    eventHandlers={{
                        click: () => {
                            setRouteTarget({
                                id: `weather:${city}`,
                                latitude: entry.latitude,
                                longitude: entry.longitude,
                            })
                        },
                        popupclose: () => clearRouteTarget(`weather:${city}`),
                    }}
                >
                    <Popup>
                        <dl className="marker-detail-facts">
                            <dt>Name</dt>
                            <dd>{city}</dd>
                            <dt>Temperature</dt>
                            <dd>
                                {Math.round(entry.temperature)}
                                {entry.temperatureUnit}
                            </dd>
                            <dt>Weather</dt>
                            <dd>{WEATHER_LABELS[entry.weatherIcon]}</dd>
                            <dt>Location</dt>
                            <dd>
                                {entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}
                            </dd>
                        </dl>
                    </Popup>
                </Marker>
            ))}
        </>
    )
}
