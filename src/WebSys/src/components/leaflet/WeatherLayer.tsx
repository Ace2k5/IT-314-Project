import { useEffect, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { getCityWeather, getRegionalWeather } from '../../cache/weatherCache'
import type { WeatherEntry, WeatherKind, WeatherMap } from '../../types/api'
import { escapeHtml } from '../../utils/escapeHtml'
import sunnyIcon from './map_assets/sunny.png'
import stormyIcon from './map_assets/stormy.png'
import rainyIcon from './map_assets/rainy.png'
import cloudyIcon from './map_assets/cloudy.png'
import snowyIcon from './map_assets/snowy.png'

/** Above this zoom the map shows one marker per city instead of one region. */
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
 * This used to be a component that rendered nothing and pushed its data back up
 * to the parent through a callback prop. Reading the zoom from the map itself
 * removes both the prop and the state that used to live in `MapView`.
 */
export function WeatherLayer() {
    const map = useMap()
    const [zoom, setZoom] = useState(() => map.getZoom())
    const [cityWeather, setCityWeather] = useState<WeatherMap | null>(null)
    const [regionalWeather, setRegionalWeather] = useState<WeatherMap | null>(null)

    useMapEvents({
        zoomend: (event) => setZoom(event.target.getZoom()),
    })

    useEffect(() => {
        let cancelled = false

        void (async () => {
            const [cities, region] = await Promise.all([getCityWeather(), getRegionalWeather()])
            if (cancelled) return
            setCityWeather(cities)
            setRegionalWeather(region)
        })()

        return () => {
            cancelled = true
        }
    }, [])

    const weather = zoom >= DETAILED_ZOOM ? cityWeather : regionalWeather
    if (!weather) return null

    return (
        <>
            {Object.entries(weather).map(([city, entry]) => (
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
