import { MapContainer, TileLayer, useMapEvents} from 'react-leaflet'
import {useState } from 'react';
import 'leaflet/dist/leaflet.css'
import { Marker, Popup, Polyline } from 'react-leaflet'
import { Weather } from './Weather';
import { EarthquakeData } from './Earthquake';
import sunnyIcon from './map_assets/sunny.png'
import stormyIcon from './map_assets/stormy.png'
import rainyIcon from './map_assets/rainy.png'
import cloudyIcon from './map_assets/cloudy.png'
import snowyIcon from './map_assets/snowy.png'
import L from 'leaflet';
import './Map.css'

type Zoom = {
    currentZoom: number
}

type location = {
  city: String,
  weather: "sunny" | "stormy" | "rainy" | "cloudy" | "snowy",
  temperature: number,
  temperature_icon: String

}

export type hull_information = {
    hull: number[]
    setHull: React.Dispatch<React.SetStateAction<Map<number, number[][]>>>
}

const weatherIcons = {
  "sunny": sunnyIcon,
  "stormy": stormyIcon,
  "rainy": rainyIcon,
  "cloudy": cloudyIcon,
  "snowy": snowyIcon
}

type Info = {
    latitude: number,
    longitude: number,
    weather_icon: string,
    temperature: number,
    temperature_unit: string
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
  const [hull, setHull] = useState(new Map())
  const [activeWeather, setActiveWeather] = useState()

  
  return (<>
    <div className="MapWrapper">
        <Weather currentZoom={currentZoom} setActiveWeather={setActiveWeather} activeWeather={activeWeather}/>
        <div className="EarthquakeDate">
            <EarthquakeData hull={hull} setHull={setHull}/>
        </div>
        <div className="map-container">
            <MapContainer
            center={[14.5995, 120.9842]}
            zoom={6}
            style={{ height: '75vh', width: '75vw' }}
            >
            <MapWatcher setZoom={setZoom}/>
            <TileLayer
                url="https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_402u_1_2b0d51d8f3e9bea980b035cc"
                attribution="&copy; OpenStreetMap contributors"
            />
            {activeWeather && Object.entries(activeWeather as Record<string, Info>).map(([city, info]) => (
                <Marker
                    key={city}
                    position={[info.latitude, info.longitude]}
                    icon={icon({
                        city,
                        weather: info.weather_icon as location["weather"],
                        temperature: info.temperature,
                        temperature_icon: info.temperature_unit,
                    })}
                >
                    <Popup>{city}</Popup>
                </Marker>
            ))}
            {Array.from(hull.values()).map((points, i) => {
                // points is an array of [lng, lat] pairs.
                // We need to convert it to an array of [lat, lng] pairs.
                const leafletPositions = points.map(([lng, lat]: Array<number>) => [lat, lng]);

                return (
                    <Polyline
                        key={i}
                        positions={leafletPositions}
                        pathOptions={{ color: 'red', weight: 3 }}
                    />
                );
            })}
            </MapContainer>
        </div>
    </div>
    </>
  )
}