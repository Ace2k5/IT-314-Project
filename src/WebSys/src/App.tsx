import { Chat } from './components/chat/Chat'
import { ChatToggleButton } from './components/chat/ChatToggleButton'
import { Debug, DebugToggleButton } from './components/debug/DebugPanel'
import { MapToggleButton } from './components/leaflet/MapToggleButton'
import { MapView } from './components/leaflet/MapView'
import { Settings, SettingsToggleButton } from './components/settings/Settings'
import { useUiStore } from './stores/useUiStore'
import './navbar.css'

function App() {
    const activePanel = useUiStore((state) => state.activePanel)
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)

    return (
        <>
            <nav className="navbar">
                <MapToggleButton />
                <ChatToggleButton />
                <DebugToggleButton />
                <SettingsToggleButton />
            </nav>

            {activePanel === 'map' ? <MapView /> : null}
            {activePanel === 'chat' ? <Chat /> : null}
            {activePanel === 'debug' ? <Debug /> : null}
            {isSettingsOpen ? <Settings /> : null}
        </>
    )
}

export default App
