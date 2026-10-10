import { useState, useEffect } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { Marker, Popup } from 'react-leaflet'
import { getWeatherCached } from "../cache";
import type { WeatherMap } from "../cache";
import sunnyIcon from './map_assets/sunny.png'
import stormyIcon from './map_assets/stormy.png'
import rainyIcon from './map_assets/rainy.png'
import cloudyIcon from './map_assets/cloudy.png'
import snowyIcon from './map_assets/snowy.png'
import L from 'leaflet';

type Zoom = {
    currentZoom: number
}

type location = {
  city: String,
  weather: "sunny" | "stormy" | "rainy" | "cloudy" | "snowy",
  temperature: number,
  temperature_icon: String

}

const weatherIcons = {
  "sunny": sunnyIcon,
  "stormy": stormyIcon,
  "rainy": rainyIcon,
  "cloudy": cloudyIcon,
  "snowy": snowyIcon
}

const icon = ({city, weather, temperature, temperature_icon}: location) => (L.divIcon({
    html: `
        <div>
            <img src=${weatherIcons[weather]} height='50vh' />
            <div>${temperature}${temperature_icon}</div>
            <div>${city}</div>
        </div>
    `
  }))

export function Weather({currentZoom}: Zoom){
    const [weatherDetailed, setWeatherDetailed] = useState<WeatherMap | null> (null) /* Both are for the map */
    const [weather, setWeather] = useState<WeatherMap | null> (null) /* Both are for the map */
    const backend = BackendConnection()

    useEffect(() => {
    let cancelled = false

    const load = async () => {
        const [detailed, normal] = await Promise.all([
            getWeatherCached(true),
            getWeatherCached(false),
        ])
        if (cancelled) return
        setWeatherDetailed(detailed)
        setWeather(normal)
    }

    load()
    return () => { cancelled = true }
    }, [])

    const active = currentZoom >= 12 ? weatherDetailed : weather
    if (!active) return null

    return (
        <>
            {Object.entries(active).map(([city, info]) => (
                <Marker
                    key={city}
                    position={[info.latitude, info.longitude]}
                    icon={icon({
                        city,
                        weather: info.weather_icon,
                        temperature: info.temperature,
                        temperature_icon: info.temperature_unit,
                    })}
                >
                    <Popup>{city}</Popup>
                </Marker>
            ))}
        </>
    )
}