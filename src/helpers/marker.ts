import { Map, Marker, Popup } from 'mapbox-gl'
import debounce from 'lodash.debounce'

import type { IQuest } from '@services/quest'

export interface CreateMarkerOptions {
  onPopupOpened?: (marker: Marker) => void
  onPopupClosed?: () => void
  onMarkerDragEnd?: (quest: IQuest) => void
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

export function createMarker(
  quest: IQuest,
  map: Map,
  options?: CreateMarkerOptions
): Marker {
  const content = getMarkerPopupContent(quest)
  const popup = new Popup().setHTML(content)

  const marker = new Marker({
    draggable: true
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

  if (options && options.onMarkerDragEnd) {
    marker.on('dragend', () => options.onMarkerDragEnd!(quest))
  }

  marker.on(
    'drag',
    debounce(() => {
      quest.location = marker.getLngLat()
      const content = getMarkerPopupContent(quest)
      popup.setHTML(content)
    }, 100)
  )

  return marker
}

function getClusterMarker(cluster: IQuest[]): Marker {
  const count = cluster.length

  const el = document.createElement('div')
  el.classList.add('cluster-marker')

  const caption = document.createElement('span')
  caption.appendChild(document.createTextNode(count.toString()))
  el.appendChild(caption)

  const marker = new Marker({
    element: el
  })

  if (count > 0) {
    const clusterCenter = cluster.reduce(
      (acc, quest) => {
        const { lng, lat } = quest.location
        const { lng: accLng, lat: accLat } = acc
        return { lng: lng + accLng, lat: lat + accLat }
      },
      { lng: 0, lat: 0 }
    )

    clusterCenter.lng /= count
    clusterCenter.lat /= count

    marker.setLngLat(clusterCenter)
  }

  return marker
}

export function createCluster(cluster: IQuest[], map: Map) {
  const marker = getClusterMarker(cluster)
  marker.addTo(map)

  return marker
}
