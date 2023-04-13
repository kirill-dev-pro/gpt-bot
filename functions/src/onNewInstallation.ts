import { db } from './db'
import { region } from 'firebase-functions/v1'

const DEFAULT_MONTHLY_TOKENS = 30000

export const onNewInstallation = region('europe-west1')
  .firestore.document('installation/{teamId}')
  .onCreate(async (snap, context) => {
    const installation = snap.data()
    if (!installation) throw new Error('No installation data')
    const { teamId } = context.params
    const id = teamId || installation.team.id || installation.enterprise.id
    if (id) throw new Error('No id found in context')
    db.collection('teams').doc(id).set({ tokensLeft: DEFAULT_MONTHLY_TOKENS })
  })
