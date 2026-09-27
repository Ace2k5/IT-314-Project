import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl, useMap } from 'react-leaflet'
import { useState } from 'react';
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
}

const weatherIcons = {
  "sunny": sunnyIcon,
  "stormy": stormyIcon,
  "rainy": rainyIcon,
  "cloudy": cloudyIcon
}

const icon = ({city, weather}: location) => (L.divIcon({
    html: `
        <div>
            <img src=${weatherIcons[weather]} height='50vh' />
            <div>31°C</div>
            <div>${city}</div>
        </div>
    `
  }))

const locations = {
    "Manila": { "latitude": 14.59262, "longitude": 120.97362 },
    "Quezon City": { "latitude": 14.6564, "longitude": 121.047806 },
    "Marikina": { "latitude": 14.63305, "longitude": 121.09894 },
    "Pasig": { "latitude": 14.59238, "longitude": 121.08618 },
    "Mandaluyong": { "latitude": 14.5777, "longitude": 121.03365 },
    "Pasay": { "latitude": 14.54347, "longitude": 120.99506 },
    "Makati": { "latitude": 14.5695, "longitude": 121.0264 },
    "Caloocan": { "latitude": 14.64882, "longitude": 120.99059 }
}

const regions = {
  "Manila": { "latitude": 14.583791118408476, "longitude": 121.0082244873047 },
}

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

function requestGeoInfo(){
  const backend = BackendConnection()
}

export function Map() {
  const [currentZoom, setZoom] = useState(6)
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
      Object.entries(locations).map(([city, position]) => (
      <Marker position={[position["latitude"], position["longitude"]]} icon={icon({city: city, weather: "sunny"})}>
        <Popup>
          {city}
        </Popup>
      </Marker>
      ))
      :
      Object.entries(regions).map(([city, position]) => (
        <Marker position={[position["latitude"], position["longitude"]]} icon={icon({city: city, weather: "sunny"})}>
        <Popup>
          {city}
        </Popup>
      </Marker>
      ))
    }
    </MapContainer>
  )
}