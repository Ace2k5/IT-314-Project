import { useState } from 'react'
import { ShowDebugPanel } from './components/debug/DebugPanelButton'
import { ShowMap } from './components/leaflet/MapButton'
import { GetWeather } from './components/weather/weather_information'

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

      <div className="weather-information">
          <GetWeather open={open}/>
      </div>
    </div>
    </>
  )
}

export default App
