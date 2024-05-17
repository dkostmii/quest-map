import { createContext } from 'react'

import { firestore } from '@services/firebase'
import QuestService from '@services/quest'
import DatabaseService from '@services/database'
import Map from '@components/Map'

const db = new DatabaseService(firestore)
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
