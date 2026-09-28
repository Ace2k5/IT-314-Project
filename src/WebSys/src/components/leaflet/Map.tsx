import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'
import sunnyIcon from './map_assets/sunny.png'
import stormyIcon from './map_assets/stormy.png'
import rainyIcon from './map_assets/rainy.png'
import cloudyIcon from './map_assets/cloudy.png'
import { BackendConnection } from '../../api/receiveAPI';

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
  "cloudy": cloudyIcon
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

function MapWatcher({setZoom}: { setZoom: React.Dispatch<React.SetStateAction<number>> }) {
    useMapEvents({
        zoomend: (event) => {
            setZoom(event.target.getZoom())
            console.log(event.target.getZoom())
        },
        click: (event) => {
        console.log(event.latlng)
    }
    })
    
    return null
}


export function MMap() {
  const [currentZoom, setZoom] = useState(6)
  const [weatherDetailed, setWeatherDetailed] = useState(new Map())
  const [weather, setWeather] = useState(new Map())
  const backend = BackendConnection()

  const get_weather = async () => {
    const detail = await backend.GetWeather(true)
    console.log("DETAIL:", detail)

    setWeatherDetailed(detail)

    const normal = await backend.GetWeather(false)
    console.log("NORMAL:", normal)

    setWeather(normal)
  }

  useEffect(() => {
    console.log("Map mounted")
    get_weather()
  }, [])
  
  return (
    <MapContainer
      center={[14.5995, 120.9842]}
      zoom={6}
      style={{ height: '100vh', width: '100vw' }}
    >
      <MapWatcher setZoom={setZoom}/>
      <TileLayer
        url="https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_402u_1_2b0d51d8f3e9bea980b035cc"
        attribution="&copy; OpenStreetMap contributors"
      />
      
      {currentZoom >= 12 ?
      
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
      ))
    }
    </MapContainer>
  )
}