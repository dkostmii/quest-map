import type { DocumentReference, Firestore } from 'firebase/firestore'
import { doc, collection, writeBatch, getDocs, query, Timestamp, GeoPoint } from 'firebase/firestore'
import { LngLat } from 'mapbox-gl'

import type { IQuest, IQuestData } from '@typing/quest'


class DatabaseService {
  constructor(private firestore: Firestore) { }

  async updateDatabase(quests: IQuest[]) {
    const snapshot = await getDocs(query(collection(this.firestore, 'quests')))

    if (snapshot.size) {
      console.debug(`Found ${snapshot.size} documents in database. Deleting them...`)

      try {
        const deleteBatch = writeBatch(this.firestore)

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
      const setBatch = writeBatch(this.firestore)
      const descSortedQuests = [...quests].sort((a, b) => b.id - a.id)
      let prevQuestDocRef: DocumentReference | null = null

      descSortedQuests.forEach((quest) => {
        const questDocRef = doc(collection(this.firestore, 'quests'))

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
      })

      await setBatch.commit()
      console.debug("Successfully added quests to database!")
    }
    catch (e) {
      console.error("Error adding quests to database:", e)
    }
  }

  async loadDatabase(): Promise<IQuest[] | undefined> {
    try {
      const snapshot = await getDocs(query(collection(this.firestore, 'quests')))
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
}

export default DatabaseService
