import { useState } from 'react'
import { ShowMap } from './components/leaflet/Map'
import { CheckStatus } from './components/website_components/test'

function App() {

  return (
    <>
    <ShowMap/>
    <CheckStatus/>
    </>
  )
}

export default App
