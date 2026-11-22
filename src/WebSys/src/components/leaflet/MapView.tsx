import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { DisasterNews } from '../news/DisasterNews'
import cycloneImg from './map_assets/cyclone.jpg'
import { EarthquakeMarkers } from './Earthquake'
import { WeatherLayer } from './WeatherLayer'
import { TyphoonMarkers } from './Typhoon'
import { ShelterMarkers } from './Shelter'
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

// Built once: recreating the icon every animation frame makes Leaflet destroy
// and recreate the <img> ~60 times per second, which can leave it missing.
const CYCLONE_ICON = L.divIcon({
    className: 'cyclone-icon',
    html: `<img src="${cycloneImg}" alt="" style="width:32px;height:32px" />`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
})

function CycloneMarker({ position, heading }: { position: [number, number]; heading: number }) {
    const markerRef = useRef<L.Marker | null>(null)

    useEffect(() => {
        const image = markerRef.current?.getElement()?.querySelector('img')
        if (image instanceof HTMLImageElement) {
            image.style.transform = `rotate(${heading}deg)`
        }
    }, [heading])

    return <Marker ref={markerRef} position={position as LatLngExpression} icon={CYCLONE_ICON} />
}

export function MapView() {
    const [earthquakeHull, setEarthquakeHull] = useState<HullByIntensity>(() => new Map())
    const [typhoonHull, setTyphoonHull] = useState<HullByIntensity>(() => new Map())
    const [typhoonTrack, setTyphoonTrack] = useState<[number, number][] | null>(null)
    const [cyclone, setCyclone] = useState<{ position: [number, number] | null; heading: number | null }>({
        position: null,
        heading: null,
    })

    return (
        <>
            <div className="map-wrapper">
                <div className="earthquake">
                    <EarthquakeMarkers hull={earthquakeHull} setHull={setEarthquakeHull} />
                </div>
                <div className="typhoon">
                    <TyphoonMarkers setHull={setTyphoonHull} setTrack={setTyphoonTrack} setCyclone={setCyclone} />
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
                        <ShelterMarkers />
                        {Array.from(earthquakeHull.entries()).map(([intensity, points]) => (
                            <Polyline
                                key={`eq-${intensity}`}
                                positions={points.map(([lon, lat]) => [lat, lon] as [number, number])}
                                pathOptions={{ color: 'red', weight: 3 }}
                            />
                        ))}
                        {Array.from(typhoonHull.entries()).map(([intensity, points]) => (
                            <Polyline
                                key={`ty-${intensity}`}
                                positions={points.map(([lon, lat]) => [lat, lon] as [number, number])}
                                pathOptions={{ color: 'green', weight: 2 }}
                            />
                        ))}
                        {typhoonTrack && (
                            <Polyline
                                positions={typhoonTrack}
                                pathOptions={{ color: 'blue', weight: 2, dashArray: '8, 8' }}
                            />
                        )}
                        {cyclone.position && cyclone.heading !== null && (
                            <CycloneMarker position={cyclone.position} heading={cyclone.heading} />
                        )}
                    </MapContainer>
                </div>
            </div>

            <div className="disaster-news">
                <DisasterNews />
            </div>
        </>
    )
}
