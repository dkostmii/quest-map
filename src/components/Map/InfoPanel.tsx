import type { FC, PropsWithChildren } from 'react'

interface Props extends PropsWithChildren {
  zoomThreshold: number
  collisionRadiusMeters: number
}

const InfoPanel: FC<Props> = ({
  children,
  zoomThreshold,
  collisionRadiusMeters
}) => (
  <>
    <p>Click on the map to add a quest</p>
    {children}
    <p>Zoom out below {zoomThreshold} to see the clusters</p>
    <p>
      Quests that are less than {collisionRadiusMeters} meters between each
      other are merged into cluster
    </p>
  </>
)

export default InfoPanel
