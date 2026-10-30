import { useState } from 'react'
import { ShowDebugPanel } from './components/debug/DebugPanelButton'
import { ShowMap } from './components/leaflet/MapButton'
import { ShowChat } from './components/chat/ChatButton'
import { MMap } from './components/leaflet/Map'
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

    </nav>

    <div className="map-component">
      {open === "map" && <MMap/>}
    </div>
    </>
  )
}

export default App
