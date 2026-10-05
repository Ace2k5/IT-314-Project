import { MapContainer, TileLayer, useMapEvents} from 'react-leaflet'
import {useState } from 'react';
import 'leaflet/dist/leaflet.css'
import { Weather } from './Weather';
import { Earthquake } from './Earthquake';

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
      <Weather currentZoom={currentZoom}/>
    </MapContainer>
  )
}