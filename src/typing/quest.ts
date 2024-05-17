import type { DocumentReference, Timestamp, GeoPoint } from 'firebase/firestore'
import type { LngLat, Map, Marker } from 'mapbox-gl'

export interface IQuest {
  id: number
  location: LngLat
  timestamp: string
  marker?: Marker
  next?: IQuest
}

export interface IQuestData {
  quest_id: number
  location: GeoPoint
  timestamp: Timestamp
  next: DocumentReference | null
}

export type Radius =
  | {
      meters: number
    }
  | {
      pixels: number
      map: Map
    }
