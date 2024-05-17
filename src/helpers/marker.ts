import { Map, Marker, Popup } from 'mapbox-gl'
import debounce from 'lodash.debounce'

import type { IQuest } from '@typing/quest'
import type { CreateMarkerOptions } from '@typing/createMarker'

class MarkerHelper {
  private static getMarkerPopupContent(quest: IQuest) {
    return `
<h1>Quest ${quest.id}</h1>
<p><strong>Created at:</strong> ${new Date(quest.timestamp).toString()}</p>
<p>Location: ${quest.location.lng.toFixed(4)},${quest.location.lat.toFixed(4)}</p>`.trimStart()
  }

  static updateMarkerPopup(quest: IQuest) {
    if (!quest.marker) {
      throw new Error('Expected marker to be defined')
    }

    const content = this.getMarkerPopupContent(quest)

    quest.marker.getPopup().setHTML(content)
  }

  static createMarker(
    quest: IQuest,
    map: Map,
    options?: CreateMarkerOptions
  ): Marker {
    const content = this.getMarkerPopupContent(quest)
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
        const content = this.getMarkerPopupContent(quest)
        popup.setHTML(content)
      }, 100)
    )

    return marker
  }
}

export default MarkerHelper
