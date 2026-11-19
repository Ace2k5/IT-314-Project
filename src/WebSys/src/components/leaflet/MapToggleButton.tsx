import { backend } from '../../api/backendClient'
import { useUiStore } from '../../stores/useUiStore'

export function MapToggleButton() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const isOpen = activePanel === 'map'

    const toggle = () => {
        void backend.log(isOpen ? '[Frontend] Closing the map.' : '[Frontend] Opening the map.')
        togglePanel('map')
    }

    return (
        <button type="button" onClick={toggle}>
            {isOpen ? 'Close Map' : 'Map'}
        </button>
    )
}
