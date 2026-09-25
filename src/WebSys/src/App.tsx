import { useState } from 'react'
import { Map } from './components/leaflet/Map'
import { CheckStatus } from './components/website_components/test'

function App() {

  return (
    <>
    <Map/>
    <CheckStatus/>
    </>
  )
}

export default App
