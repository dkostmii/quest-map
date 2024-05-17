import type { Marker } from 'mapbox-gl'
import type { IQuest } from '@typing/quest'

export interface CreateMarkerOptions {
  onPopupOpened?: (marker: Marker) => void
  onPopupClosed?: () => void
  onMarkerDragEnd?: (quest: IQuest) => void
}
