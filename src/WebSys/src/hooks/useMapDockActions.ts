import { useLocationStore } from '../stores/useLocationStore'
import { useMapDockStore } from '../stores/useMapDockStore'
import type { MapPanel } from '../stores/useMapDockStore'
import { useMapLayersStore } from '../stores/useMapLayersStore'
import { useShelterStore } from '../stores/useShelterStore'
import { useUiStore } from '../stores/useUiStore'

/**
 * Opens/closes the floating map window. Shelters are a temporary map mode:
 * entering hides city weather, and leaving restores it.
 */
export function useMapDockActions() {
    const openPanel = useMapDockStore((state) => state.openPanel)
    const setPanel = useMapDockStore((state) => state.setPanel)
    const closeMapPanel = useMapDockStore((state) => state.closePanel)
    const setShowWeather = useMapLayersStore((state) => state.setShowWeather)
    const clearShelterSelection = useShelterStore((state) => state.clearSelection)
    const coords = useLocationStore((state) => state.coords)
    const locationStatus = useLocationStore((state) => state.status)
    const openLocationPicker = useUiStore((state) => state.openLocationPicker)

    const closePanel = () => {
        if (openPanel === 'shelter') setShowWeather(true)
        closeMapPanel()
    }

    const togglePanel = (panel: MapPanel) => {
        if (openPanel === panel) {
            closePanel()
            return
        }

        if (openPanel === 'shelter') setShowWeather(true)
        setPanel(panel)

        if (panel === 'shelter') {
            setShowWeather(false)
            clearShelterSelection()

            if (!coords && (locationStatus === 'idle' || locationStatus === 'error')) {
                openLocationPicker()
            }
        }
    }

    return { openPanel, closePanel, togglePanel }
}
