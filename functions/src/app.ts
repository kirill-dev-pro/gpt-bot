import { db } from './db'
import { CloudLogger } from './logger'
import { config, logger } from 'firebase-functions'
import { App, ExpressReceiver, Installation, LogLevel } from '@slack/bolt'

const { slack } = config()

export const expressReceiver = new ExpressReceiver({
  signingSecret: slack.secret,
  endpoints: '/',
  logger: new CloudLogger(LogLevel.INFO),
  processBeforeResponse: false,
  clientId: slack.client_id,
  clientSecret: slack.client_secret,
  stateSecret: 'very-very-secret',
  scopes: [
    'chat:write',
    'commands',
    'users:read',
    'im:history',
    'im:write',
    'app_mentions:read',
    'channels:history',
  ],
  redirectUri: 'https://europe-west1-gpt-bot-73f5b.cloudfunctions.net/slackbot/oauth_redirect',
  installerOptions: {
    redirectUriPath: '/oauth_redirect',
    stateVerification: false,
  },
  dispatchErrorHandler: async ({ error, logger, request, response }) => {
    logger.error('dispatch error handler', error, request, response)
  },
  processEventErrorHandler: async ({ error, logger, request, response }) => {
    logger.error('process event error handler', error, request, response)
    return true
  },
  unhandledRequestHandler: async ({ logger, request, response }) => {
    logger.error('unhandled request handler', request, response)
  },
  installationStore: {
    storeInstallation: async installation => {
      logger.info('storeInstallation', installation)
      // change the line below so it saves to your database
      if (installation.isEnterpriseInstall && installation.enterprise !== undefined) {
        // support for org wide app installation
        await db.collection('installations').doc(installation.enterprise.id).set(installation)
        return
      } else if (installation.team !== undefined) {
        // single team app installation
        await db.collection('installations').doc(installation.team.id).set(installation)
        return
      }
      throw new Error('Failed saving installation data to installationStore')
    },
    fetchInstallation: async installQuery => {
      // logger.info('fetchInstallation', installQuery)
      // change the line below so it fetches from your database
      if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
        // org wide app installation lookup
        const doc = await db.collection('installations').doc(installQuery.enterpriseId).get()
        const data = doc.data() as Installation<'v2', boolean>
        if (data) return data
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation lookup
        const doc = await db.collection('installations').doc(installQuery.teamId).get()
        const data = doc.data() as Installation<'v2', boolean>
        if (data) return data
      }
      throw new Error('Failed fetching installation')
    },
    deleteInstallation: async installQuery => {
      logger.info('deleteInstallation', installQuery)
      // change the line below so it deletes from your database
      if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
        // org wide app installation deletion
        await db.collection('installations').doc(installQuery.enterpriseId).delete()
        return
      }
      if (installQuery.teamId !== undefined) {
        // single team app installation deletion
        await db.collection('installations').doc(installQuery.teamId).delete()
        return
      }
      throw new Error('Failed to delete installation')
    },
  },
})

export const app = new App({
  receiver: expressReceiver,
  processBeforeResponse: false,
  // token: slack.token,
  logger: new CloudLogger(LogLevel.INFO),
})
