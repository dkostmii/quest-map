import { useRef, useEffect, useState } from 'react'

import mapboxgl, { Map as MapboxMap, Marker } from 'mapbox-gl'

import useQuestService from '@hooks/quest'

import MarkerHelper from '@helpers/marker'
import ClusterHelper from '@helpers/cluster'
import type { CreateMarkerOptions } from '@typing/createMarker'

import Sidebar from './Sidebar'
import Loader from './Loader'
import RemoveButtons from './RemoveButtons'
import InfoPanel from './InfoPanel'

import style from './Map.module.css'
import '~mapbox-gl-style'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
const zoomThreshold = 8
const collisionRadiusMeters = 20000
const nearestMarkerClickRadiusPixels = 36

function Map() {
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)
  const [isLoading, setIsLoading] = useState(true)
  const [clusterMarkers] = useState<Marker[]>([])
  const [markers] = useState<Marker[]>([])
  const [activeMarker, setActiveMarker] = useState<Marker | null>(null)

  const map = useRef<MapboxMap | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const questService = useQuestService()

  const createMarkerOptions: CreateMarkerOptions = {
    onPopupOpened: (marker) => setActiveMarker(marker),
    onPopupClosed: () => setActiveMarker(null),
    onMarkerDragEnd: async (quest) => await questService.updateQuest(quest)
  }

  const zoomBelowThreshold = zoom < zoomThreshold

  useEffect(() => {
    if (map.current) {
      if (zoomBelowThreshold) {
        clusterMarkers.splice(0)

        markers.forEach((marker) => marker.remove())

        const clusters = questService.getClusters({
          meters: collisionRadiusMeters
        })

        clusters.forEach((cluster) => {
          const clusterMarker = ClusterHelper.createCluster(
            cluster,
            map.current!
          )
          clusterMarkers.push(clusterMarker)
        })
      } else {
        clusterMarkers.forEach((marker) => marker.remove())
        markers.splice(0)

        setIsLoading(true)
        questService.getAll().then((quests) => {
          quests.forEach((quest) => {
            const marker = MarkerHelper.createMarker(
              quest,
              map.current!,
              createMarkerOptions
            )
            quest.marker = marker
            markers.push(marker)
            setIsLoading(false)
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
        pixels: nearestMarkerClickRadiusPixels
      })

      if (nearest) {
        return
      }

      setIsLoading(true)
      const quest = await questService.add(e.lngLat)
      setIsLoading(false)
      quest.marker = MarkerHelper.createMarker(
        quest,
        map.current!,
        createMarkerOptions
      )
      markers.push(quest.marker)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeActiveQuestHandler = async () => {
    if (activeMarker) {
      const quest = questService.findByMarker(activeMarker)

      if (quest) {
        setIsLoading(true)
        await questService.remove(quest)
        setIsLoading(false)
      }
    }
  }

  const removeAllHandler = async () => {
    setIsLoading(true)
    await questService.removeAll()
    setIsLoading(false)
  }

  return (
    <div>
      <InfoPanel
        zoomThreshold={zoomThreshold}
        collisionRadiusMeters={collisionRadiusMeters}
      >
        <RemoveButtons
          onRemoveAllHandlerClicked={removeAllHandler}
          onRemoveActiveQuestClicked={removeActiveQuestHandler}
        />
      </InfoPanel>
      <div className={style.container}>
        <Sidebar zoom={zoom} lng={lng} lat={lat} />
        <Loader isLoading={isLoading} />
        <div ref={mapContainer} className={style.map} />
      </div>
    </div>
  )
}

export default Map
