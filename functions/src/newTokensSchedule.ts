import { db, setTokensLeft } from './db'
import { region } from 'firebase-functions/v1'

const DEFAULT_WEEKLY_TOKENS = 10000

export const newTokensSchedule = region('europe-west1')
  .pubsub.schedule('0 0 * * 1') // “At 00:00 on Monday.”
  .onRun(async () => {
    // for each team
    const teams = await db.collection('teams').listDocuments()
    const promises = teams.map(team => setTokensLeft(team.id, DEFAULT_WEEKLY_TOKENS))
    await Promise.all(promises)
  })
