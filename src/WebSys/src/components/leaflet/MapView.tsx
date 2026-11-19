import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { MapContainer, Polyline, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { DisasterNews } from '../news/DisasterNews'
import { EarthquakeDatePicker } from './Earthquake'
import { WeatherLayer } from './WeatherLayer'
import './MapView.css'

/** Intensity -> hull outline, as `[longitude, latitude]` pairs. */
export type HullByIntensity = Map<number, [number, number][]>

export type HullState = {
    hull: HullByIntensity
    setHull: Dispatch<SetStateAction<HullByIntensity>>
}

const MANILA_CENTER: [number, number] = [14.5995, 120.9842]
const INITIAL_ZOOM = 6

const TILE_URL =
    import.meta.env.VITE_TILE_URL ??
    'https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_402u_1_2b0d51d8f3e9bea980b035cc'

export function MapView() {
    const [hull, setHull] = useState<HullByIntensity>(() => new Map())

    return (
        <>
            <div className="map-wrapper">
                <div className="earthquake-date">
                    <EarthquakeDatePicker hull={hull} setHull={setHull} />
                </div>
                <div className="map-container">
                    <MapContainer
                        center={MANILA_CENTER}
                        zoom={INITIAL_ZOOM}
                        style={{ height: '75vh', width: '75vw' }}
                    >
                        <TileLayer
                            url={TILE_URL}
                            attribution="&copy; OpenStreetMap contributors"
                        />
                        <WeatherLayer />
                        {Array.from(hull.entries()).map(([intensity, points]) => (
                            <Polyline
                                key={intensity}
                                positions={points.map(([lon, lat]) => [lat, lon] as [number, number])}
                                pathOptions={{ color: 'red', weight: 3 }}
                            />
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div className="disaster-news">
                <DisasterNews />
            </div>
        </>
    )
}
