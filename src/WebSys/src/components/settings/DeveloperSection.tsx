import { backend } from '../../api/backendClient'
import { toShelterEntries } from '../leaflet/shelterUtils'
import { useAlertStore } from '../../stores/useAlertStore'
import { useHazardStore } from '../../stores/useHazardStore'
import { useLocationStore } from '../../stores/useLocationStore'
import { useRouteStore } from '../../stores/useRouteStore'
import { useShelterDataStore } from '../../stores/useShelterDataStore'
import { useShelterStore } from '../../stores/useShelterStore'
import { useUiStore } from '../../stores/useUiStore'
import {
    createSimulatedEarthquake,
    createSimulatedTyphoon,
    FALLBACK_ORIGIN,
    jitterNearby,
} from '../../utils/simulateHazard'
import type { SimulationOrigin } from '../../utils/simulateHazard'
import type { SettingsSection } from './sections'
import './DeveloperSection.css'

type SectionButtonProps = {
    activeSection: SettingsSection
    setActiveSection: (section: SettingsSection) => void
}

type SimulationKind = 'earthquake' | 'typhoon'

async function routeToNearestShelter(origin: SimulationOrigin) {
    await useShelterDataStore.getState().loadShelters()
    const centers = useShelterDataStore.getState().centers
    const nearest = toShelterEntries(centers ?? {}, origin)[0]
    if (!nearest) return

    useRouteStore.getState().setTarget({
        id: `shelter:${nearest.id}`,
        latitude: nearest.center.lat,
        longitude: nearest.center.lon,
    })
}

function startSimulation(kind: SimulationKind) {
    const coords = useLocationStore.getState().coords
    const origin = jitterNearby(
        coords ? { latitude: coords.latitude, longitude: coords.longitude } : FALLBACK_ORIGIN,
    )

    useRouteStore.getState().clearTarget()
    useShelterStore.getState().clearSelection()

    const hazards = useHazardStore.getState()
    if (kind === 'earthquake') {
        hazards.selectEarthquake(createSimulatedEarthquake(origin))
        hazards.clearTyphoon()
    } else {
        hazards.selectTyphoon(createSimulatedTyphoon(origin))
        hazards.clearEarthquake()
    }

    useAlertStore.getState().start(kind, origin)
    useUiStore.getState().closeSettings()
    useUiStore.getState().closeLocationPicker()
    useUiStore.getState().showPanel('map')

    void backend.log(
        `Simulated ${kind} near ${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}.`,
    )
    void routeToNearestShelter(origin)
}

export function DeveloperSectionButton({ activeSection, setActiveSection }: SectionButtonProps) {
    return (
        <button
            type="button"
            className={`btn-sidebar${activeSection === 'developer' ? ' active' : ''}`}
            onClick={() => setActiveSection('developer')}
        >
            <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
            </svg>
            <span>Developer</span>
        </button>
    )
}

export function DeveloperSection() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const closeSettings = useUiStore((state) => state.closeSettings)
    const isDebugOpen = activePanel === 'debug'

    const toggleDebugPanel = () => {
        void backend.log(isDebugOpen ? 'Closing the debug panel.' : 'Opening the debug panel.')
        togglePanel('debug')

        // The debug panel renders behind the settings overlay, so opening it
        // has to close Settings for the panel to be visible.
        if (!isDebugOpen) closeSettings()
    }

    return (
        <div className="developer-section">
            <h2>Developer</h2>
            <p className="section-description">
                The debug panel checks the backend connection and shows the loaded evacuation
                centres.
            </p>
            <button type="button" className="developer-btn" onClick={toggleDebugPanel}>
                {isDebugOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}
            </button>

            <div className="developer-group">
                <h3 className="developer-group-title">Simulation</h3>
                <p className="developer-help">
                    Spawn a simulated earthquake or typhoon within 100 m of your location. The
                    map opens in high alert and routes to the nearest evacuation center.
                </p>
                <div className="developer-simulation-actions">
                    <button
                        type="button"
                        className="developer-btn"
                        onClick={() => startSimulation('earthquake')}
                    >
                        Simulate Earthquake
                    </button>
                    <button
                        type="button"
                        className="developer-btn"
                        onClick={() => startSimulation('typhoon')}
                    >
                        Simulate Typhoon
                    </button>
                </div>
            </div>
        </div>
    )
}
