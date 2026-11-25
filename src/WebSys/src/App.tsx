import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import { AlertView } from './components/alerts/AlertView'
import { Chat } from './components/chat/Chat'
import { ChatToggleButton } from './components/chat/ChatToggleButton'
import { Debug } from './components/debug/DebugPanel'
import { MapToggleButton } from './components/leaflet/MapToggleButton'
import { LocationPicker } from './components/location/LocationPicker'
import { MapView } from './components/leaflet/MapView'
import { Overview, OverviewToggleButton } from './components/overview/Overview'
import { Settings, SettingsToggleButton } from './components/settings/Settings'
import { fontStack, useAppearanceStore } from './stores/useAppearanceStore'
import { useUiStore } from './stores/useUiStore'
import './navbar.css'
import './responsive.css'

/** How close (in px from the top) the pointer must be for the navbar to show. */
const NAVBAR_REVEAL_ZONE = 80

function App() {
    const activePanel = useUiStore((state) => state.activePanel)
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)
    const isLocationPickerOpen = useUiStore((state) => state.isLocationPickerOpen)
    const iconPopupSpeed = useAppearanceStore((state) => state.iconPopupSpeed)
    const fontFamily = useAppearanceStore((state) => state.fontFamily)
    const [isNavbarVisible, setIsNavbarVisible] = useState(false)

    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            setIsNavbarVisible(event.clientY <= NAVBAR_REVEAL_ZONE)
        }

        window.addEventListener('pointermove', handlePointerMove)
        return () => window.removeEventListener('pointermove', handlePointerMove)
    }, [])

    return (
        <div
            className="app-shell"
            style={
                {
                    '--icon-pop-speed': `${iconPopupSpeed}s`,
                    '--font-family': fontStack(fontFamily),
                } as CSSProperties
            }
        >
            <nav className={`navbar${isNavbarVisible ? ' navbar-visible' : ''}`}>
                <OverviewToggleButton />
                <MapToggleButton />
                <ChatToggleButton />
                <SettingsToggleButton />
            </nav>

            {activePanel === 'overview' ? <Overview /> : null}
            {activePanel === 'map' ? <MapView /> : null}
            {activePanel === 'chat' ? <Chat /> : null}
            {activePanel === 'debug' ? <Debug /> : null}
            {isLocationPickerOpen ? <LocationPicker /> : null}
            <AlertView />
            {isSettingsOpen ? <Settings /> : null}
        </div>
    )
}

export default App
