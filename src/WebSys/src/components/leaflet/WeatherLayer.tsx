import { useEffect, useMemo, useState, useRef } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { getCityWeather, pickRegions } from '../../cache/weatherCache'
import type { WeatherEntry, WeatherMap } from '../../types/api'
import { escapeHtml } from '../../utils/escapeHtml'
import { WEATHER_ICONS } from '../weather/weatherIcons'

/** Above this zoom the map shows every city; below it, one marker per region. */
export const DETAILED_ZOOM = 12

function createWeatherIcon(city: string, entry: WeatherEntry) {
    const icon = WEATHER_ICONS[entry.weatherIcon] ?? WEATHER_ICONS.sunny
    return L.divIcon({
        className: 'weather-marker',
        iconSize: [48, 48],
        html: `<div>
            <img src="${icon}" height="40" alt="" />
            <div>${escapeHtml(String(Math.round(entry.temperature)))}${escapeHtml(entry.temperatureUnit)}</div>
            <div>${escapeHtml(city)}</div>
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
                >
                    <Popup>
                        {city}: {Math.round(entry.temperature)}
                        {entry.temperatureUnit}
                    </Popup>
                </Marker>
            ))}
        </>
    )
}
