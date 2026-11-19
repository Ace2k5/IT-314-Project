import { useEffect, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { getCityWeather, pickRegions } from '../../cache/weatherCache'
import type { WeatherEntry, WeatherKind, WeatherMap } from '../../types/api'
import { escapeHtml } from '../../utils/escapeHtml'
import sunnyIcon from './map_assets/sunny.png'
import stormyIcon from './map_assets/stormy.png'
import rainyIcon from './map_assets/rainy.png'
import cloudyIcon from './map_assets/cloudy.png'
import snowyIcon from './map_assets/snowy.png'

/** Above this zoom the map shows every city; below it, one marker per region. */
export const DETAILED_ZOOM = 12

const WEATHER_ICONS: Record<WeatherKind, string> = {
    sunny: sunnyIcon,
    stormy: stormyIcon,
    rainy: rainyIcon,
    cloudy: cloudyIcon,
    snowy: snowyIcon,
}

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

    const visible = zoom >= DETAILED_ZOOM ? weather : pickRegions(weather)

    return (
        <>
            {Object.entries(visible).map(([city, entry]) => (
                <Marker
                    key={city}
                    position={[entry.latitude, entry.longitude]}
                    icon={createWeatherIcon(city, entry)}
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
