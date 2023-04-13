import * as admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://xxxxx.firebaseio.com',
})

export const db = admin.firestore()
db.settings({ timestampsInSnapshots: true, ignoreUndefinedProperties: true })

export type TeamData = {
  token?: string
  model?: string
  personality?: string
  tokensLeft: number
}

export const getTeamData = async (teamId: string) => {
  const doc = await db.collection('teams').doc(teamId!).get()
  const teamConfig = doc.data() as TeamData
  if (!teamConfig) return null
  return teamConfig
}

export const setTeamData = async (teamId: string, data: TeamData) => {
  await db.collection('teams').doc(teamId!).set(data, { merge: true })
}

export const setTokensLeft = async (teamId: string, tokensLeft: number) => {
  const teamConfig = await getTeamData(teamId)
  if (!teamConfig) return
  await db.collection('teams').doc(teamId!).set({ tokensLeft }, { merge: true })
}
