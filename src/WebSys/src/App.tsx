import { useState } from 'react'
import { ShowDebugPanel } from './components/debug/DebugPanelButton'
import { ShowMap } from './components/leaflet/MapButton'
import { ShowChat } from './components/chat/ChatButton'

function App() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
    <div className="debug-button">
      <ShowDebugPanel open={open} setOpen={setOpen}/>
    </div>

    <div className="map">
      <div className="map-button">
        <ShowMap open={open} setOpen={setOpen}/>
      </div>

    </div>

    <div className="chat-button">
      <ShowChat open={open} setOpen={setOpen}/>
    </div>

    </>
  )
}

export default App
