import { useLocationStore } from '../../stores/useLocationStore'
import { useShelterStore } from '../../stores/useShelterStore'
import { formatDistanceKm } from './shelterUtils'
import type { ShelterEntry } from './shelterUtils'

type ShelterPanelProps = {
    shelters: ShelterEntry[]
    ready: boolean
    onRequestLocation: () => void
}

/** Contents of the draggable Shelters window. */
export function ShelterPanel({ shelters, ready, onRequestLocation }: ShelterPanelProps) {
    const status = useLocationStore((state) => state.status)
    const error = useLocationStore((state) => state.error)
    const selectedId = useShelterStore((state) => state.selectedId)
    const selectShelter = useShelterStore((state) => state.selectShelter)
    const minDistanceKm = useShelterStore((state) => state.minDistanceKm)
    const setMinDistanceKm = useShelterStore((state) => state.setMinDistanceKm)
    const radiusMode = useShelterStore((state) => state.radiusMode)
    const setRadiusMode = useShelterStore((state) => state.setRadiusMode)
    const radiusKm = useShelterStore((state) => state.radiusKm)
    const setRadiusKm = useShelterStore((state) => state.setRadiusKm)

    const currentIndex = shelters.findIndex((shelter) => shelter.id === selectedId)
    const current = shelters[currentIndex >= 0 ? currentIndex : 0]
    const locationReady = status === 'ready'

    const step = (delta: number) => {
        if (shelters.length === 0) return
        const base = currentIndex >= 0 ? currentIndex : 0
        const next = (base + delta + shelters.length) % shelters.length
        selectShelter(shelters[next].id)
    }

    const countLabel = !ready
        ? 'Loading shelters…'
        : radiusMode
          ? `${shelters.length} shelter${shelters.length === 1 ? '' : 's'} within ${radiusKm} km`
          : `${shelters.length} shelter${shelters.length === 1 ? '' : 's'} shown`

    return (
        <div className="shelter-panel">
            {!locationReady ? (
                <div className="shelter-location">
                    <p>
                        {status === 'locating'
                            ? 'Getting your location…'
                            : status === 'denied'
                              ? 'Location permission was denied. Enable it for this site, then try again.'
                              : error ||
                                'Enable location to find the closest shelter and sort by distance.'}
                    </p>
                    <button
                        type="button"
                        className="shelter-action"
                        onClick={onRequestLocation}
                        disabled={status === 'locating'}
                    >
                        {status === 'locating'
                            ? 'Locating…'
                            : status === 'denied'
                              ? 'Try again'
                              : 'Use my location'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="shelter-controls">
                        <label className="shelter-control">
                            <span>
                                Minimum spacing <strong>{minDistanceKm.toFixed(1)} km</strong>
                            </span>
                            <input
                                type="range"
                                min={0.5}
                                max={15}
                                step={0.5}
                                value={minDistanceKm}
                                onChange={(event) =>
                                    setMinDistanceKm(Number(event.target.value))
                                }
                            />
                        </label>

                        <label className="shelter-check">
                            <input
                                type="checkbox"
                                checked={radiusMode}
                                onChange={(event) => setRadiusMode(event.target.checked)}
                            />
                            <span>Check shelters around my location</span>
                        </label>

                        {radiusMode ? (
                            <label className="shelter-control">
                                <span>
                                    Radius <strong>{radiusKm} km</strong>
                                </span>
                                <input
                                    type="range"
                                    min={1}
                                    max={50}
                                    step={1}
                                    value={radiusKm}
                                    onChange={(event) => setRadiusKm(Number(event.target.value))}
                                />
                            </label>
                        ) : null}
                    </div>

                    <p className="shelter-count">{countLabel}</p>

                    {current ? (
                        <div className="shelter-card">
                            <span className="shelter-type">{current.center.type}</span>
                            <h3>{current.center.name}</h3>
                            <p className="shelter-distance">
                                {formatDistanceKm(current.distanceKm)} away
                            </p>
                            {current.center.address ? (
                                <p className="shelter-address">{current.center.address}</p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="shelter-empty">
                            {ready
                                ? 'No shelters match these filters. Try a wider radius or less spacing.'
                                : 'Fetching the evacuation centres…'}
                        </p>
                    )}

                    <div className="shelter-carousel">
                        <button
                            type="button"
                            aria-label="Previous shelter"
                            onClick={() => step(-1)}
                            disabled={shelters.length < 2}
                        >
                            ‹
                        </button>
                        <span>
                            {shelters.length > 0 ? (currentIndex >= 0 ? currentIndex : 0) + 1 : 0}{' '}
                            / {shelters.length}
                        </span>
                        <button
                            type="button"
                            aria-label="Next shelter"
                            onClick={() => step(1)}
                            disabled={shelters.length < 2}
                        >
                            ›
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
