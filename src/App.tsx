import { createContext } from 'react'

import QuestService from '@services/quest'
import Map from '@components/Map'

export const MapContext = createContext<QuestService>(null)

function App() {
  return (
    <MapContext.Provider value={new QuestService()}>
      <Map />
    </MapContext.Provider>
  )
}

export default App
