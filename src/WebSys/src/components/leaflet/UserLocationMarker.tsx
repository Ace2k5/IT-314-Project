import { Circle, Marker, Popup } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'

import { useLocationStore } from '../../stores/useLocationStore'
import userMarker from './map_assets/user_marker.png'

const USER_ICON = L.divIcon({
    className: 'user-location-marker',
    html: `<img src="${userMarker}" alt="" />`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
})

/** The user's position, plus the browser-reported accuracy circle. */
export function UserLocationMarker() {
    const coords = useLocationStore((state) => state.coords)

    if (!coords) return null

    const position: LatLngExpression = [coords.latitude, coords.longitude]

    return (
        <>
            <Circle
                center={position}
                radius={Math.max(coords.accuracy, 25)}
                pathOptions={{
                    color: 'blue',
                    weight: 1,
                    opacity: 0.35,
                    fillColor: 'blue',
                    fillOpacity: 0.06,
                }}
            />
            <Marker position={position} icon={USER_ICON} zIndexOffset={1000}>
                <Popup>
                    <strong>Your location</strong>
                    <br />±{Math.round(coords.accuracy)} m accuracy
                </Popup>
            </Marker>
        </>
    )
}
