import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useEffect } from 'react'
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useShelterEntries } from '../../hooks/useShelterEntries'
import { useAlertStore } from '../../stores/useAlertStore'
import { useAppearanceStore } from '../../stores/useAppearanceStore'
import type { BasemapKey } from '../../stores/useAppearanceStore'
import { useHazardStore } from '../../stores/useHazardStore'
import { useLocationStore } from '../../stores/useLocationStore'
import { useMapDockStore } from '../../stores/useMapDockStore'
import { useMapLayersStore } from '../../stores/useMapLayersStore'
import { useShelterDataStore } from '../../stores/useShelterDataStore'
import { useShelterStore } from '../../stores/useShelterStore'
import { DisasterNews } from '../news/DisasterNews'
import { WEATHER_ICONS } from '../weather/weatherIcons'
import { EarthquakeMarkers } from './Earthquake'
import { MapDock } from './MapDock'
import { RouteLayer } from './RouteLayer'
import { ShelterMarkers } from './Shelter'
import { TyphoonMarkers } from './Typhoon'
import { UserLocationMarker } from './UserLocationMarker'
import { WeatherLayer } from './WeatherLayer'
import './MapView.css'

const MANILA_CENTER: [number, number] = [14.5995, 120.9842]
const INITIAL_ZOOM = 6

/** MapLibre parses vector tiles in a worker; Vite needs the bundled worker URL. */
setWorkerUrl(workerUrl)

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

/** The basemaps Leaflet can draw as plain raster tiles. */
const RASTER_BASEMAPS: Record<
    Exclude<BasemapKey, 'openfreemap'>,
    { url: string; attribution: string }
> = {
    openstreetmap: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    voyager: {
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png?key=cb1_402u_1_2b0d51d8f3e9bea980b035cc',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    },
}

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

/** Zoom to the simulated hazard when high alert starts. */
function AlertFocus() {
    const map = useMap()
    const alert = useAlertStore((state) => state.alert)

    useEffect(() => {
        if (!alert) return
        map.flyTo(
            [alert.origin.latitude, alert.origin.longitude],
            Math.max(map.getZoom(), 13),
            { duration: 0.8 },
        )
    }, [alert, map])

    return null
}

/** OpenFreeMap serves vector tiles, which Leaflet renders through MapLibre. */
function OpenFreeMapLayer() {
    const map = useMap()

    useEffect(() => {
        const layer = maplibreGL({ style: OPENFREEMAP_STYLE }).addTo(map)

        return () => {
            // The plugin adds the style's attribution to Leaflet but never removes it.
            const attribution = layer.getAttribution?.()
            if (attribution) map.attributionControl.removeAttribution(attribution)
            layer.remove()
        }
    }, [map])

    return null
}

export function MapView() {
    const loadHazards = useHazardStore((state) => state.loadHazards)
    const loadShelters = useShelterDataStore((state) => state.loadShelters)
    const selectedEarthquake = useHazardStore((state) => state.selectedEarthquake)
    const selectedTyphoon = useHazardStore((state) => state.selectedTyphoon)

    const openPanel = useMapDockStore((state) => state.openPanel)
    const showWeather = useMapLayersStore((state) => state.showWeather)
    const toggleWeather = useMapLayersStore((state) => state.toggleWeather)

    const coords = useLocationStore((state) => state.coords)
    const basemap = useAppearanceStore((state) => state.basemap)

    const sheltersReady = useShelterDataStore((state) => state.ready)
    const sheltersForDisplay = useShelterEntries()
    const selectedShelterId = useShelterStore((state) => state.selectedId)
    const selectShelter = useShelterStore((state) => state.selectShelter)
    const clearShelterSelection = useShelterStore((state) => state.clearSelection)
    const radiusMode = useShelterStore((state) => state.radiusMode)
    const radiusKm = useShelterStore((state) => state.radiusKm)

    useEffect(() => {
        void loadHazards()
        void loadShelters()
    }, [loadHazards, loadShelters])

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
                            {basemap === 'openfreemap' ? (
                                <OpenFreeMapLayer />
                            ) : (
                                <TileLayer
                                    url={RASTER_BASEMAPS[basemap].url}
                                    attribution={RASTER_BASEMAPS[basemap].attribution}
                                />
                            )}
                            {weatherVisible ? <WeatherLayer /> : null}
                            <RouteLayer />
                            <AlertFocus />
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

                    <MapDock />
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
