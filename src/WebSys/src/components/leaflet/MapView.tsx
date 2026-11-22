import { useEffect, useMemo, useState } from 'react'
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { getEarthquakeEvents } from '../../cache/earthquakeCache'
import { getEvacuationCenters } from '../../cache/evacCenterCache'
import { getTyphoon } from '../../cache/typhoonCache'
import { useLocationStore } from '../../stores/useLocationStore'
import { useMapDockStore } from '../../stores/useMapDockStore'
import type { MapPanel } from '../../stores/useMapDockStore'
import { useMapLayersStore } from '../../stores/useMapLayersStore'
import { useShelterStore } from '../../stores/useShelterStore'
import type { EarthquakeEvent, EvacuationCenters, TyphoonEvent } from '../../types/api'
import { DisasterNews } from '../news/DisasterNews'
import { WEATHER_ICONS } from '../weather/weatherIcons'
import { EarthquakeMarkers } from './Earthquake'
import { MapDock } from './MapDock'
import { ShelterMarkers } from './Shelter'
import { filterByRadius, filterBySpacing, toShelterEntries } from './shelterUtils'
import { TyphoonMarkers } from './Typhoon'
import { UserLocationMarker } from './UserLocationMarker'
import { WeatherLayer } from './WeatherLayer'
import './MapView.css'

const MANILA_CENTER: [number, number] = [14.5995, 120.9842]
const INITIAL_ZOOM = 6

const TILE_URL =
    import.meta.env.VITE_TILE_URL ??
    'https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_402u_1_2b0d51d8f3e9bea980b035cc'

/**
 * When the radius appears, bring the map close enough to read it and place the
 * user slightly above center so the floating window does not cover the circle.
 */
function RadiusFocus({ latitude, longitude }: { latitude: number; longitude: number }) {
    const map = useMap()

    useEffect(() => {
        const zoom = Math.max(map.getZoom(), 12)
        const point = map.project([latitude, longitude], zoom)
        const offset = map.getSize().y * 0.22
        const center = map.unproject(point.add([0, offset]), zoom)
        map.flyTo(center, zoom, { duration: 0.6 })
    }, [latitude, longitude, map])

    return null
}

export function MapView() {
    const [earthquakeEvents, setEarthquakeEvents] = useState<EarthquakeEvent[]>([])
    const [typhoonEvents, setTyphoonEvents] = useState<TyphoonEvent[]>([])
    const [earthquakeReady, setEarthquakeReady] = useState(false)
    const [typhoonReady, setTyphoonReady] = useState(false)
    const [shelters, setShelters] = useState<EvacuationCenters | null>(null)
    const [sheltersReady, setSheltersReady] = useState(false)

    const [selectedEarthquake, setSelectedEarthquake] = useState<EarthquakeEvent | null>(null)
    const [selectedTyphoon, setSelectedTyphoon] = useState<TyphoonEvent | null>(null)

    const openPanel = useMapDockStore((state) => state.openPanel)
    const setMapPanel = useMapDockStore((state) => state.setPanel)
    const closeMapPanel = useMapDockStore((state) => state.closePanel)

    const showWeather = useMapLayersStore((state) => state.showWeather)
    const setShowWeather = useMapLayersStore((state) => state.setShowWeather)
    const toggleWeather = useMapLayersStore((state) => state.toggleWeather)

    const coords = useLocationStore((state) => state.coords)
    const locationStatus = useLocationStore((state) => state.status)
    const requestLocation = useLocationStore((state) => state.requestLocation)

    const selectedShelterId = useShelterStore((state) => state.selectedId)
    const selectShelter = useShelterStore((state) => state.selectShelter)
    const clearShelterSelection = useShelterStore((state) => state.clearSelection)
    const minDistanceKm = useShelterStore((state) => state.minDistanceKm)
    const radiusMode = useShelterStore((state) => state.radiusMode)
    const radiusKm = useShelterStore((state) => state.radiusKm)

    useEffect(() => {
        let cancelled = false

        void getEarthquakeEvents().then((events) => {
            if (cancelled) return
            setEarthquakeEvents(events)
            setEarthquakeReady(true)
        })
        void getTyphoon().then((events) => {
            if (cancelled) return
            setTyphoonEvents(events)
            setTyphoonReady(true)
        })
        void getEvacuationCenters().then((centers) => {
            if (cancelled) return
            setShelters(centers ?? {})
            setSheltersReady(true)
        })

        return () => {
            cancelled = true
        }
    }, [])

    const sheltersForDisplay = useMemo(() => {
        const entries = toShelterEntries(shelters ?? {}, coords)
        const radiusFiltered =
            openPanel === 'shelter' && radiusMode
                ? filterByRadius(entries, radiusKm)
                : entries
        return filterBySpacing(radiusFiltered, minDistanceKm)
    }, [shelters, coords, openPanel, radiusMode, radiusKm, minDistanceKm])

    /**
     * Opening the Shelters window (or changing its filters) keeps a valid
     * selection: the nearest shelter is selected when there is none, and a
     * shelter removed by the filters is replaced by the new nearest.
     */
    useEffect(() => {
        if (openPanel !== 'shelter' || !sheltersReady || !coords) return

        if (sheltersForDisplay.length === 0) {
            if (selectedShelterId !== null) clearShelterSelection()
            return
        }

        if (!sheltersForDisplay.some((shelter) => shelter.id === selectedShelterId)) {
            selectShelter(sheltersForDisplay[0].id)
        }
    }, [
        openPanel,
        sheltersReady,
        coords,
        sheltersForDisplay,
        selectedShelterId,
        selectShelter,
        clearShelterSelection,
    ])

    const handleClosePanel = () => {
        if (openPanel === 'shelter') setShowWeather(true)
        closeMapPanel()
    }

    const handleTogglePanel = (panel: MapPanel) => {
        // Clicking the active dock button closes the window.
        if (openPanel === panel) {
            handleClosePanel()
            return
        }

        // Leaving Shelters restores city weather; entering it removes weather.
        if (openPanel === 'shelter') setShowWeather(true)
        setMapPanel(panel)

        if (panel === 'shelter') {
            setShowWeather(false)
            // Each fresh open starts at the closest shelter; the selection
            // effect picks the nearest once location and shelters are ready.
            clearShelterSelection()

            if (!coords && (locationStatus === 'idle' || locationStatus === 'error')) {
                void requestLocation()
            }
        }
    }

    const selectEarthquake = (event: EarthquakeEvent) => setSelectedEarthquake(event)
    const selectTyphoon = (event: TyphoonEvent) => setSelectedTyphoon(event)

    const clearEarthquake = () => {
        setSelectedEarthquake(null)
    }

    const clearTyphoon = () => {
        setSelectedTyphoon(null)
    }

    const shelterMarkersVisible = openPanel === 'shelter'
    const weatherVisible = showWeather && openPanel !== 'shelter'

    return (
        <div className="map-page">
            <div className="map-stage">
                <div className="map-shell">
                    <div className="map-canvas">
                        <MapContainer
                            center={MANILA_CENTER}
                            zoom={INITIAL_ZOOM}
                            className="leaflet-map"
                        >
                            <TileLayer
                                url={TILE_URL}
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            {weatherVisible ? <WeatherLayer /> : null}
                            <UserLocationMarker />
                            <ShelterMarkers
                                shelters={sheltersForDisplay}
                                enabled={shelterMarkersVisible}
                            />
                            <EarthquakeMarkers event={selectedEarthquake} />
                            <TyphoonMarkers event={selectedTyphoon} />
                            {openPanel === 'shelter' && radiusMode && coords ? (
                                <>
                                    <RadiusFocus
                                        latitude={coords.latitude}
                                        longitude={coords.longitude}
                                    />
                                    <Circle
                                        center={[coords.latitude, coords.longitude]}
                                        radius={radiusKm * 1000}
                                        pathOptions={{
                                            color: 'blue',
                                            weight: 1.5,
                                            dashArray: '6 6',
                                            fillColor: 'blue',
                                            fillOpacity: 0.05,
                                        }}
                                    />
                                </>
                            ) : null}
                        </MapContainer>
                    </div>

                    <div className="map-identity">
                        <span className="map-live-dot" aria-hidden="true" />
                        <div className="map-identity-text">
                            <strong>Disaster Watch</strong>
                            <span>
                                {new Date().toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}{' '}
                                · Philippines
                            </span>
                        </div>
                    </div>

                    {openPanel !== 'shelter' ? (
                        <button
                            type="button"
                            className={`map-layer-toggle${showWeather ? ' on' : ''}`}
                            role="switch"
                            aria-checked={showWeather}
                            onClick={toggleWeather}
                        >
                            <img src={WEATHER_ICONS.sunny} alt="" />
                            <span>City weather</span>
                            <span className="switch-track" aria-hidden="true">
                                <span className="switch-thumb" />
                            </span>
                        </button>
                    ) : null}

                    <div className="map-legend" aria-label="Map legend">
                        <h2>Legend</h2>
                        <ul>
                            <li>
                                <span
                                    className="legend-swatch legend-earthquake"
                                    aria-hidden="true"
                                />
                                Earthquake intensity
                            </li>
                            <li>
                                <span className="legend-swatch legend-wind" aria-hidden="true" />
                                Wind radii
                            </li>
                            <li>
                                <span className="legend-swatch legend-track" aria-hidden="true" />
                                Typhoon track
                            </li>
                        </ul>
                    </div>

                    <MapDock
                        earthquakeEvents={earthquakeEvents}
                        typhoonEvents={typhoonEvents}
                        earthquakeReady={earthquakeReady}
                        typhoonReady={typhoonReady}
                        selectedEarthquake={selectedEarthquake}
                        selectedTyphoon={selectedTyphoon}
                        selectedShelterId={selectedShelterId}
                        shelters={sheltersForDisplay}
                        sheltersReady={sheltersReady}
                        openPanel={openPanel}
                        onTogglePanel={handleTogglePanel}
                        onClosePanel={handleClosePanel}
                        onSelectEarthquake={selectEarthquake}
                        onSelectTyphoon={selectTyphoon}
                        onClearEarthquake={clearEarthquake}
                        onClearTyphoon={clearTyphoon}
                        onRequestLocation={() => {
                            void requestLocation()
                        }}
                    />
                </div>
            </div>

            <section className="disaster-news" aria-labelledby="news-heading">
                <h2 id="news-heading" className="news-heading">
                    Latest Disaster News
                </h2>
                <DisasterNews />
            </section>
        </div>
    )
}
