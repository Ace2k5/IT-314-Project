import { useState } from 'react'
import type { LatLng } from 'leaflet'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { useLocationStore } from '../../stores/useLocationStore'
import { useUiStore } from '../../stores/useUiStore'
import { formatAccuracy } from '../../utils/locationFormat'
import './LocationPicker.css'

const MANILA_CENTER: [number, number] = [14.5995, 120.9842]

function PickPoint({ onPick }: { onPick: (point: LatLng) => void }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng)
        },
    })
    return null
}

export function LocationPicker() {
    const isOpen = useUiStore((state) => state.isLocationPickerOpen)
    const close = useUiStore((state) => state.closeLocationPicker)
    const coords = useLocationStore((state) => state.coords)
    const status = useLocationStore((state) => state.status)
    const error = useLocationStore((state) => state.error)
    const requestLocation = useLocationStore((state) => state.requestLocation)
    const setManualLocation = useLocationStore((state) => state.setManualLocation)

    const [isManual, setIsManual] = useState(false)
    const [picked, setPicked] = useState<LatLng | null>(null)

    if (!isOpen) return null

    const closePicker = () => {
        setIsManual(false)
        setPicked(null)
        close()
    }

    const mapCenter: [number, number] = coords
        ? [coords.latitude, coords.longitude]
        : MANILA_CENTER

    const summary = coords
        ? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)} · ${
              coords.source === 'manual'
                  ? 'Pinned manually'
                  : `±${formatAccuracy(coords.accuracy)}`
          }`
        : 'No location set yet.'

    return (
        <div className="location-picker-background">
            <div
                className="location-picker"
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-picker-title"
            >
                <header className="location-picker-topbar">
                    <h2 id="location-picker-title">Find Location</h2>
                    <button
                        type="button"
                        className="location-close"
                        onClick={closePicker}
                        aria-label="Close location picker"
                    >
                        ×
                    </button>
                </header>

                {isManual ? (
                    <>
                        <p className="location-picker-summary">
                            {picked
                                ? `Pinned at ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`
                                : 'Click the map to place your pin.'}
                        </p>

                        <div className="location-picker-map">
                            <MapContainer
                                center={mapCenter}
                                zoom={11}
                                className="location-picker-map-canvas"
                            >
                                <TileLayer
                                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <PickPoint onPick={setPicked} />
                                {picked ? (
                                    <CircleMarker
                                        center={picked}
                                        radius={7}
                                        pathOptions={{
                                            color: 'white',
                                            weight: 2,
                                            fillColor: '#4f92f0',
                                            fillOpacity: 1,
                                        }}
                                    />
                                ) : null}
                            </MapContainer>
                        </div>

                        <div className="location-picker-actions">
                            <button
                                type="button"
                                className="location-secondary"
                                onClick={() => {
                                    setIsManual(false)
                                    setPicked(null)
                                }}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className="location-primary"
                                disabled={!picked}
                                onClick={() => {
                                    if (!picked) return
                                    setManualLocation(picked.lat, picked.lng)
                                    closePicker()
                                }}
                            >
                                Use this location
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="location-picker-summary">{summary}</p>

                        <div className="location-choices">
                            <button
                                type="button"
                                className="location-choice"
                                onClick={() => setIsManual(true)}
                            >
                                <span className="location-choice-title">Manual</span>
                                <span className="location-choice-note">
                                    Pick the exact spot on a map.
                                </span>
                            </button>
                            <button
                                type="button"
                                className="location-choice"
                                onClick={() => {
                                    void requestLocation()
                                }}
                                disabled={status === 'locating'}
                            >
                                <span className="location-choice-title">
                                    Automatic (High chance of inaccuracy)
                                </span>
                                <span className="location-choice-note">
                                    Uses the browser&apos;s location, which can be off by tens of
                                    kilometres.
                                </span>
                            </button>
                        </div>

                        {status === 'locating' ? (
                            <p className="location-picker-note">Locating…</p>
                        ) : null}
                        {error ? <p className="location-picker-error">{error}</p> : null}

                        {coords ? (
                            <div className="location-picker-actions">
                                <button
                                    type="button"
                                    className="location-primary"
                                    onClick={closePicker}
                                >
                                    Done
                                </button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    )
}
