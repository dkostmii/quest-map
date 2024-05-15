import type { Firestore, DocumentReference } from 'firebase/firestore'
import { doc, collection, writeBatch, getDocs, query, Timestamp, GeoPoint } from 'firebase/firestore'

import { LngLat, Map, Marker } from 'mapbox-gl'

import { updateMarkerPopup } from '@helpers/marker'

export interface IQuest {
  id: number
  location: LngLat
  timestamp: string
  marker?: Marker
  next?: IQuest
}

interface IQuestData {
  quest_id: number,
  location: GeoPoint,
  timestamp: Timestamp,
  next: DocumentReference | null
}

type Radius = {
  meters: number
} | {
  pixels: number
  map: Map
}

async function updateDatabase(db: Firestore, quests: IQuest[]) {
  const snapshot = await getDocs(query(collection(db, 'quests')))

  if (snapshot.size) {
    console.debug(`Found ${snapshot.size} documents in database. Deleting them...`)

    try {
      const deleteBatch = writeBatch(db)

      snapshot.forEach((docSnapshot) => {
        deleteBatch.delete(docSnapshot.ref)
      })

      await deleteBatch.commit()
      console.debug("Successfully cleaned quests database!")
    } catch (e) {
      console.error("Error while cleaning quests database:", e)
    }
  }

  try {
    const setBatch = writeBatch(db)
    const descSortedQuests = [...quests].sort((a, b) => b.id - a.id)
    let prevQuestDocRef = null

    for (const quest of descSortedQuests) {
      const questDocRef = doc(collection(db, 'quests'))

      const timestampMillis = new Date(quest.timestamp).getTime()
      const timestampSeconds = Math.floor(timestampMillis / 1000)
      const timestampNanosec = (timestampMillis - timestampSeconds * 1000) * 1_000_000

      const data: IQuestData = {
        quest_id: quest.id,
        location: new GeoPoint(quest.location.lat, quest.location.lng),
        timestamp: new Timestamp(timestampSeconds, timestampNanosec),
        next: null
      }

      if (quest.next) {
        data.next = prevQuestDocRef
      }

      setBatch.set(questDocRef, data)
      prevQuestDocRef = questDocRef
    }
    await setBatch.commit()
    console.debug("Successfully added quests to database!")
  }
  catch (e) {
    console.error("Error adding quests to database:", e)
  }
}

async function loadDatabase(db: Firestore): Promise<IQuest[] | undefined> {
  try {
    const snapshot = await getDocs(query(collection(db, 'quests')))
    const quests: IQuest[] = []

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as IQuestData
      const nextRef = data.next
      const nextSnapshot = nextRef ? snapshot.docs.find((s) => s.id === nextRef!.id) : null

      const quest: IQuest = {
        id: data.quest_id,
        location: new LngLat(data.location.longitude, data.location.latitude),
        timestamp: data.timestamp.toDate().toISOString()
      }

      if (nextSnapshot) {
        const nextData = nextSnapshot.data() as IQuestData
        const nextQuest: IQuest = {
          id: nextData.quest_id,
          location: new LngLat(nextData.location.longitude, nextData.location.latitude),
          timestamp: nextData.timestamp.toDate().toISOString()
        }

        quest.next = nextQuest
      }

      quests.push(quest)
    })

    return quests
  } catch (e) {
    console.error("Error loading database", e)
  }
}

class QuestService {
  private quests: IQuest[] = []
  private db: Firestore
  private dbLoaded: boolean = false

  constructor(db: Firestore) {
    this.db = db
  }

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

    await updateDatabase(this.db, this.quests)

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

    await updateDatabase(this.db, this.quests)

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
    await updateDatabase(this.db, this.quests)

    console.debug("Removed all quests")
  }

  getNearest(location: LngLat, withinRadius: Radius): IQuest | null {
    let nearestSoFar: IQuest | null = null
    let minDistance = Number.POSITIVE_INFINITY

    if (this.quests.length === 0) return null

    for (const quest of this.quests) {
      const distance = location.distanceTo(quest.location)

      if (withinRadius) {
        if ('meters' in withinRadius) {
          if (distance > withinRadius.meters) continue
        }

        if ('pixels' in withinRadius) {
          const projLocation = withinRadius.map.project(location)
          const projQuestLocation = withinRadius.map.project(quest.location)

          const distancePixels = projLocation.dist(projQuestLocation)

          if (distancePixels > withinRadius.pixels) continue
        }
      }

      if (!nearestSoFar) {
        nearestSoFar = quest
        continue
      }

      if (distance < minDistance) {
        nearestSoFar = quest
        minDistance = distance
      }
    }

    console.debug("Found nearest quest:", nearestSoFar)

    return nearestSoFar
  }

  async getAll(): Promise<IQuest[]> {
    if (this.dbLoaded) {
      console.debug("Getting all quests...")
      return this.quests
    }

    console.debug("Getting all quests from database...")
    const quests = await loadDatabase(this.db)

    if (quests) {
      this.quests = quests
    }

    return this.quests
  }

  async updateQuest(quest: IQuest): Promise<IQuest | undefined> {
    if (!this.quests.includes(quest)) {
      return
    }

    await updateDatabase(this.db, this.quests)
    return quest
  }

  getClusters(withinRadius: Radius): IQuest[][] {
    const clusters: IQuest[][] = []

    if ('meters' in withinRadius) {
      for (const questA of this.quests) {
        const cluster = this.quests.filter(questB => (
          questB.location.distanceTo(questA.location) < withinRadius.meters
        ))

        clusters.push(cluster)
      }
    } else {
      for (const questA of this.quests) {
        const cluster = this.quests.filter(questB => {
          const projQuestALocation = withinRadius.map.project(questA.location)
          const projQuestBLocation = withinRadius.map.project(questB.location)

          const distancePixels = projQuestALocation.dist(projQuestBLocation)

          return distancePixels < withinRadius.pixels
        })

        clusters.push(cluster)
      }
    }

    return clusters
  }

  findByMarker(marker: Marker) {
    return this.quests.find(q => q.marker === marker)
  }
}

export default QuestService
