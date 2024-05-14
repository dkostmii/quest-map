import React, { useRef, useEffect, useState } from 'react'

import mapboxgl from 'mapbox-gl'

import style from './Map.module.css'
import '~mapbox-gl-style'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function Map() {
  const map = useRef(null)
  const mapContainer = useRef(null)
  const [lng] = useState(-70.9)
  const [lat] = useState(42.35)
  const [zoom] = useState(9)

  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    })
  }, [lng, lat, zoom])

  return (
    <div>
      <div ref={mapContainer} className={style.container} />
    </div>
  )
}

export default Map
