import { useState, useEffect } from "react";
import { BackendConnection } from "../../api/receiveAPI";
import { Marker, Popup } from 'react-leaflet'
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
  weather: "sunny" | "stormy" | "rainy" | "cloudy",
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
    const [weatherDetailed, setWeatherDetailed] = useState(new Map()) /* Both are for the map */
    const [weather, setWeather] = useState(new Map()) /* Both are for the map */
    const backend = BackendConnection()
    const [requested, setRequested] = useState(false)
    const [requestedDetail, setDetail] = useState(false)

    const get_weather = async (is_detailed: boolean) => {
    if (is_detailed){
        const detail = await backend.GetWeather(true)
        if (detail.size === 0) {
        backend.Log("[Frontend] Detailed weather has nothing to display yet.")
        }
        else {
        console.log("[Frontend] Detailed Weather:", detail)
        setWeatherDetailed(detail)
        }
    }
    else {
        if (weather.size === 0) {
        backend.Log("[Frontend] Weather has nothing to display yet.")
        }
        {
        const normal = await backend.GetWeather(false)
        console.log("[Frontend] Normal Weather:", normal)
        setWeather(normal)
        }
    }
    }

    useEffect(() => {
    console.log("Map mounted")
    if (requested) {
        console.log("Map has been requested already, ignoring...")
    }
    else if (!requested && currentZoom < 12) {
        get_weather(false)
        setRequested(true)
    }
    if (requestedDetail) {
        console.log("Map has been requested already, ignoring...")
    }
    else if (!requestedDetail && currentZoom >= 12){
        get_weather(true)
        setDetail(true)
    }
    }, [currentZoom ])

    return (
        <>
        {currentZoom >= 12 && (weatherDetailed && weather) ?
        
        Object.entries(weatherDetailed).map(([city, info]) => (
        <Marker position={[info["latitude"], info["longitude"]]} icon={icon({city: city, weather: info["weather_icon"], temperature: info["temperature"], temperature_icon: info["temperature_unit"]})}>
        <Popup>
            {city}
        </Popup>
        </Marker>
        ))
        :
        Object.entries(weather).map(([city, info]) => (
        <Marker position={[info["latitude"], info["longitude"]]} icon={icon({city: city, weather: info["weather_icon"], temperature: info["temperature"], temperature_icon: info["temperature_unit"]})}>
        <Popup>
            {city}
        </Popup>
        </Marker>
                )
            )
        }
        </>
        )
    }