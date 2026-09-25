import { useState } from 'react'
import { Map } from './components/leaflet/Map'
import { ShowDebugPanel } from './components/debug/DebugPanelButton'
import { ShowMap } from './components/leaflet/MapButton'

function App() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
    <ShowDebugPanel open={open} setOpen={setOpen}/>
    <ShowMap open={open} setOpen={setOpen}/>
    </>
  )
}

export default App
