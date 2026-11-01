import { useState } from 'react'
import { ShowDebugPanel } from './components/debug/DebugPanelButton'
import { ShowMap } from './components/leaflet/MapButton'
import { ShowChat } from './components/chat/ChatButton'
import { MMap } from './components/leaflet/Map'
import { SettingsButton, Settings } from './components/settings/settings'
import './navbar.css'

function App() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
    <nav className='navbar'>

      <div className="map">
        <div className="map-button">
          <ShowMap open={open} setOpen={setOpen}/>
        </div>
      </div>

      <div className="chat-button">
        <ShowChat open={open} setOpen={setOpen}/>
      </div>

      <div className="debug-button">
        <ShowDebugPanel open={open} setOpen={setOpen}/>
      </div>

      <div className="settings-button">
        <SettingsButton open={open} setOpen={setOpen}/>
      </div>

    </nav>

    <div className="map-component">
      {open === "map" && <MMap/>}
    </div>
    <div className="settings-component">
      {open === "settings" && <Settings open={open} setOpen={setOpen}/>}
    </div>

    </>
  )
}

export default App
