import * as admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://xxxxx.firebaseio.com',
})

export const db = admin.firestore()
db.settings({ timestampsInSnapshots: true, ignoreUndefinedProperties: true })
