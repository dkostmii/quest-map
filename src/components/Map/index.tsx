import { useRef, useEffect, useState, useContext } from 'react'

import mapboxgl, { Map as MapboxMap, Marker } from 'mapbox-gl'

import { MapContext } from '@/App'
import QuestService from '@services/quest'

import { createMarker, createCluster, CreateMarkerOptions } from '@helpers/marker'

import style from './Map.module.css'
import '~mapbox-gl-style'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function Map() {
  const map = useRef<MapboxMap | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)
  const zoomBelowThreshold = zoom < 8
  const [clusterMarkers] = useState<Marker[]>([])
  const [activeMarker, setActiveMarker] = useState<Marker | null>(null)

  const questService = useContext<QuestService>(MapContext)

  const createMarkerOptions: CreateMarkerOptions = {
    onPopupOpened: (marker) => setActiveMarker(marker),
    onPopupClosed: () => setActiveMarker(null)
  }

  useEffect(() => {
    if (map.current) {
      if (zoomBelowThreshold) {
        clusterMarkers.splice(0)

        for (const cluster of questService.getClusters({ meters: 20000 })) {
          for (const quest of cluster) {
            quest.marker.remove()
          }

          const clusterMarker = createCluster(cluster, map.current!)
          clusterMarkers.push(clusterMarker)
        }
      } else {
        for (const clusterMarker of clusterMarkers) {
          clusterMarker.remove()
        }

        for (const quest of questService.getAll()) {
          const marker = createMarker(quest, map.current!, createMarkerOptions)
          quest.marker = marker
        }
      }
    }
  }, [zoomBelowThreshold])

  useEffect(() => {
    if (map.current) return
    map.current = new MapboxMap({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    })

    map.current.on('move', () => {
      setLng(map.current!.getCenter().lng)
      setLat(map.current!.getCenter().lat)
      setZoom(map.current!.getZoom())
    })

    map.current.on('click', (e) => {
      if (zoomBelowThreshold) {
        return
      }

      const nearest = questService.getNearest(e.lngLat, {
        map: map.current!,
        pixels: 36
      })

      if (nearest) {
        if (e.originalEvent.button === 3) {
          nearest.marker.remove()
        }

        return
      }

      const quest = questService.add(e.lngLat)
      quest.marker = createMarker(quest, map.current!, createMarkerOptions)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeActiveQuestHandler = () => {
    if (activeMarker) {
      const quest = questService.findByMarker(activeMarker)

      if (quest) {
        questService.remove(quest)
      }
    }
  }

  return (
    <div>
      <p>Click on the map to add a quest</p>
      <button type="button" onClick={removeActiveQuestHandler}>
        Remove active quest
      </button>
      <button type="button" onClick={() => questService.removeAll()}>
        Remove all quests
      </button>
      <div className={style.sidebar}>
        Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom:{' '}
        {zoom.toFixed(2)}
      </div>
      <div ref={mapContainer} className={style.container} />
    </div>
  )
}

export default Map
