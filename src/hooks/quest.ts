import { useContext } from 'react'
import { MapContext } from '@/App'

function useQuestService() {
  const questService = useContext(MapContext)
  return questService
}

export default useQuestService
