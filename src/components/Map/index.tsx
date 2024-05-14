import { useRef, useEffect, useState } from 'react'

import mapboxgl, { Map as MapboxMap } from 'mapbox-gl'

import style from './Map.module.css'
import '~mapbox-gl-style'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function Map() {
  const map = useRef<MapboxMap | null>(null)
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)

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
  }, [lng, lat, zoom])

  return (
    <div>
      <div className={style.sidebar}>
        Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom:{' '}
        {zoom.toFixed(2)}
      </div>
      <div ref={mapContainer} className={style.container} />
    </div>
  )
}

export default Map
