import type { FC } from 'react'

import style from './Map.module.css'

interface Props {
  isLoading: boolean
}

const Loader: FC<Props> = ({ isLoading }) =>
  isLoading && <div className={style.overlay}>Loading...</div>

export default Loader
