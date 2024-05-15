import { createContext } from 'react'

import QuestService from '@services/quest'
import { db } from '@services/firebase'
import Map from '@components/Map'

const questService = new QuestService(db)
export const MapContext = createContext<QuestService>(questService)

function App() {
  return (
    <MapContext.Provider value={questService}>
      <Map />
    </MapContext.Provider>
  )
}

export default App
