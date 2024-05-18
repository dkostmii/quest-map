import type { FC } from 'react'

import style from './Map.module.css'

interface Props {
  lng: number
  lat: number
  zoom: number
}

const Sidebar: FC<Props> = ({ lng, lat, zoom }) => (
  <div className={style.sidebar}>
    Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom:{' '}
    {zoom.toFixed(2)}
  </div>
)

export default Sidebar
