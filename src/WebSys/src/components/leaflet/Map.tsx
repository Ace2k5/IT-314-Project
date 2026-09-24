import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export function ShowMap() {
  return (
    <MapContainer
      center={[14.5995, 120.9842]}
      zoom={6}
      style={{ height: '50vh', width: '50vw' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      <Marker position={[14.5995, 120.9842]}>
        <Popup>
          Manila
        </Popup>
      </Marker>
    </MapContainer>
  )
}