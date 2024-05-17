import { Map, Marker } from 'mapbox-gl'
import type { IQuest } from '@typing/quest'

class ClusterHelper {
  private static getClusterMarker(cluster: IQuest[]): Marker {
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

  static createCluster(cluster: IQuest[], map: Map) {
    const marker = this.getClusterMarker(cluster)
    marker.addTo(map)

    return marker
  }
}

export default ClusterHelper
