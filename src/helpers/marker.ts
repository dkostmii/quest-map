import { Map, Marker, Popup } from 'mapbox-gl'
import debounce from 'lodash.debounce'

import type { IQuest } from '@services/quest'

export interface CreateMarkerOptions {
  onPopupOpened?: (marker: Marker) => void
  onPopupClosed?: () => void
}

function getMarkerPopupContent(quest: IQuest) {
  return `
<h1>Quest ${quest.id}</h1>
<p><strong>Created at:</strong> ${new Date(quest.timestamp).toString()}</p>
<p>Location: ${quest.location.lng.toFixed(4)},${quest.location.lat.toFixed(4)}</p>`.trimStart()
}

export function updateMarkerPopup(quest: IQuest) {
  if (!quest.marker) {
    throw new Error('Expected marker to be defined')
  }

  const content = getMarkerPopupContent(quest)

  quest.marker.getPopup().setHTML(content)
}

export function createMarker(quest: IQuest, map: Map, options?: CreateMarkerOptions): Marker {
  const content = getMarkerPopupContent(quest)
  const popup = new Popup().setHTML(content)

  const marker = new Marker({
    draggable: true,
  })
    .setLngLat(quest.location)
    .setPopup(popup)
    .addTo(map)

  if (options && options.onPopupOpened) {
    popup.on('open', () => options.onPopupOpened!(marker))
  }

  if (options && options.onPopupClosed) {
    popup.on('close', () => options.onPopupClosed!())
  }

  marker.on('drag', debounce(() => {
    quest.location = marker.getLngLat()
    const content = getMarkerPopupContent(quest)
    popup.setHTML(content)
  }, 100))

  return marker
}
