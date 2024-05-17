import { LngLat, Marker } from 'mapbox-gl'

import { updateMarkerPopup } from '@helpers/marker'
import DatabaseService from '@services/database'
import type { IQuest, Radius } from '@typing/quest'


class QuestService {
  private quests: IQuest[] = []
  private dbLoaded: boolean = false

  constructor(private db: DatabaseService) { }

  async add(location: LngLat): Promise<IQuest> {
    const lastQuest = this.quests.length > 0 ? this.quests[this.quests.length - 1] : null

    const newQuest = {
      id: this.quests.length + 1,
      location,
      timestamp: new Date().toISOString()
    }

    if (lastQuest) {
      lastQuest.next = newQuest
    }

    this.quests.push(newQuest)
    console.debug("Added quest:", newQuest)

    await this.db.updateDatabase(this.quests)

    return newQuest
  }

  async remove(quest: IQuest): Promise<void> {
    if (!this.quests.includes(quest)) {
      return
    }

    const removeId = this.quests.indexOf(quest)
    this.quests.splice(removeId, 1)

    const beforeRemoved = this.quests[removeId - 1]
    const afterRemoved = this.quests[removeId]

    if (beforeRemoved) {
      beforeRemoved.next = afterRemoved
    }

    if (afterRemoved) {
      this.updateIds(afterRemoved, afterRemoved.id - 1)
      this.updateMarkers(afterRemoved)
    }

    quest.marker?.remove()

    await this.db.updateDatabase(this.quests)

    console.debug("Removed quest:", quest)
  }

  private updateIds(quest: IQuest, startId: number) {
    let prev = quest
    prev.id = startId

    let current = quest.next

    while (current) {
      current.id = prev.id + 1
      prev = current
      current = current.next
    }
  }

  private updateMarkers(quest: IQuest) {
    let current: IQuest | undefined = quest

    while (current) {
      updateMarkerPopup(quest)

      current = current.next
    }
  }

  async removeAll(): Promise<void> {
    for (const quest of this.quests) {
      quest.marker?.remove()
    }

    this.quests.splice(0)
    await this.db.updateDatabase(this.quests)

    console.debug("Removed all quests")
  }

  getNearest(location: LngLat, withinRadius: Radius): IQuest | null {
    let nearestSoFar: IQuest | null = null
    let minDistance = Number.POSITIVE_INFINITY

    if (this.quests.length === 0) return null

    this.quests.forEach((quest) => {
      const distance = location.distanceTo(quest.location)

      if (withinRadius) {
        if ('meters' in withinRadius) {
          if (distance > withinRadius.meters) return
        }

        if ('pixels' in withinRadius) {
          const projLocation = withinRadius.map.project(location)
          const projQuestLocation = withinRadius.map.project(quest.location)

          const distancePixels = projLocation.dist(projQuestLocation)

          if (distancePixels > withinRadius.pixels) return
        }
      }

      if (!nearestSoFar) {
        nearestSoFar = quest
        return
      }

      if (distance < minDistance) {
        nearestSoFar = quest
        minDistance = distance
      }
    })

    console.debug("Found nearest quest:", nearestSoFar)

    return nearestSoFar
  }

  async getAll(): Promise<IQuest[]> {
    if (this.dbLoaded) {
      console.debug("Getting all quests...")
      return this.quests
    }

    console.debug("Getting all quests from database...")
    const quests = await this.db.loadDatabase()

    if (quests) {
      this.quests = quests
    }

    this.dbLoaded = true

    return this.quests
  }

  async updateQuest(quest: IQuest): Promise<IQuest | undefined> {
    if (!this.quests.includes(quest)) {
      return
    }

    await this.db.updateDatabase(this.quests)
    return quest
  }

  getClusters(withinRadius: Radius): IQuest[][] {
    const clusters: IQuest[][] = []

    if ('meters' in withinRadius) {
      this.quests.forEach((questA) => {
        const cluster = this.quests.filter(questB => (
          questB.location.distanceTo(questA.location) < withinRadius.meters
        ))

        clusters.push(cluster)
      })
    } else {
      this.quests.forEach((questA) => {
        const cluster = this.quests.filter(questB => {
          const projQuestALocation = withinRadius.map.project(questA.location)
          const projQuestBLocation = withinRadius.map.project(questB.location)

          const distancePixels = projQuestALocation.dist(projQuestBLocation)

          return distancePixels < withinRadius.pixels
        })

        clusters.push(cluster)
      })
    }

    return clusters
  }

  findByMarker(marker: Marker) {
    return this.quests.find(q => q.marker === marker)
  }
}

export default QuestService
