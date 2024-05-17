import { useRef, useEffect, useState } from 'react'

import mapboxgl, { Map as MapboxMap, Marker } from 'mapbox-gl'

import useQuestService from '@hooks/quest'

import {
  createMarker,
  createCluster,
  CreateMarkerOptions
} from '@helpers/marker'

import style from './Map.module.css'
import '~mapbox-gl-style'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
const zoomThreshold = 8
const collisionRadiusMeters = 20000

function Map() {
  const map = useRef<MapboxMap | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)
  const zoomBelowThreshold = zoom < zoomThreshold
  const [clusterMarkers] = useState<Marker[]>([])
  const [markers] = useState<Marker[]>([])
  const [activeMarker, setActiveMarker] = useState<Marker | null>(null)

  const questService = useQuestService()

  const createMarkerOptions: CreateMarkerOptions = {
    onPopupOpened: (marker) => setActiveMarker(marker),
    onPopupClosed: () => setActiveMarker(null),
    onMarkerDragEnd: async (quest) => await questService.updateQuest(quest)
  }

  useEffect(() => {
    if (map.current) {
      if (zoomBelowThreshold) {
        clusterMarkers.splice(0)

        markers.forEach((marker) => marker.remove())

        const clusters = questService.getClusters({
          meters: collisionRadiusMeters
        })

        clusters.forEach((cluster) => {
          const clusterMarker = createCluster(cluster, map.current!)
          clusterMarkers.push(clusterMarker)
        })
      } else {
        clusterMarkers.forEach((marker) => marker.remove())
        markers.splice(0)

        questService.getAll().then((quests) => {
          quests.forEach((quest) => {
            const marker = createMarker(
              quest,
              map.current!,
              createMarkerOptions
            )
            quest.marker = marker
            markers.push(marker)
          })
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    map.current.on('click', async (e) => {
      if (zoomBelowThreshold) {
        return
      }

      const nearest = questService.getNearest(e.lngLat, {
        map: map.current!,
        pixels: 36
      })

      if (nearest) {
        return
      }

      const quest = await questService.add(e.lngLat)
      quest.marker = createMarker(quest, map.current!, createMarkerOptions)
      markers.push(quest.marker)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeActiveQuestHandler = async () => {
    if (activeMarker) {
      const quest = questService.findByMarker(activeMarker)

      if (quest) {
        await questService.remove(quest)
      }
    }
  }

  return (
    <div>
      <p>Click on the map to add a quest</p>
      <button type="button" onClick={removeActiveQuestHandler}>
        Remove active quest
      </button>
      <button type="button" onClick={questService.removeAll.bind(questService)}>
        Remove all quests
      </button>
      <p>Zoom out below {zoomThreshold} to see the clusters</p>
      <p>
        Quests that are less than {collisionRadiusMeters} meters between each
        other are merged into cluster
      </p>
      <div ref={mapContainer} className={style.container} />
      <div className={style.sidebar}>
        Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom:{' '}
        {zoom.toFixed(2)}
      </div>
    </div>
  )
}

export default Map
