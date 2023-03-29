import { askGPT4, PromptMessage } from './ai'
import { db } from './db'
import { setTokenCommand, setModelCommand, setPersonality } from './commands'
import { app, expressReceiver } from './app'
import { logger, region } from 'firebase-functions'
import { UsersInfoResponse } from '@slack/web-api'

export type TeamConfig = {
  token?: string
  model?: string
  personality?: string
}

app.use(async ({ context, next }) => {
  if (context.retryNum) {
    logger.log('Skipping request', context)
    return
  }
  await next()
})

// Global error handler
app.error(async err => {
  logger.error('Unhandled error:', err)
})

app.event('app_mention', async ({ payload, say, context }) => {
  logger.log('mention', payload)

  if (!payload.team) throw new Error('Team not found in payload')

  const teamId = payload.team
  const doc = await db.collection('teams').doc(teamId!).get()
  const { token, model, personality } = (doc.data() || {}) as TeamConfig

  if (!token) {
    await say({ text: 'Please set token first', thread_ts: payload.thread_ts || payload.ts })
    return
  }

  // get thread messages
  const threadMessages = await app.client.conversations.replies({
    token: context.botToken,
    channel: payload.channel,
    ts: payload.thread_ts || payload.ts,
    limit: 20,
  })

  const usersRequests: Record<string, Promise<UsersInfoResponse>> = {}
  threadMessages.messages?.forEach(m => {
    if (m.user && !usersRequests[m.user]) {
      usersRequests[m.user] = app.client.users.info({
        token: context.botToken,
        user: m.user,
      })
    }
  })

  const responsesArray = await Promise.all(Object.values(usersRequests))
  const users: Record<string, UsersInfoResponse['user']> = {}
  responsesArray.forEach(({ ok, user }) => {
    if (ok && user) {
      users[user.id!] = user
    }
  })

  // logger.log('users', Object.entries(users))

  const getFormatedName = (u: UsersInfoResponse['user']) => {
    if (!u) return undefined
    return (u.real_name || u.name)!
      .trim()
      .replace(' ', '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
  }

  const history = (threadMessages.messages || []).map(
    m =>
      ({
        role: m.bot_id ? 'assistant' : 'user',
        content: !m.bot_id ? (m.text || '').replace(/<@U\w+?>/, 'Chatbot').trim() : m.text,
        name: !m.bot_id && m.user ? getFormatedName(users[m.user]) : undefined,
      } as PromptMessage),
  )

  // logger.log('messages', history)

  try {
    const result = await askGPT4(history, token, model, personality)
    await say({ text: result, thread_ts: payload.thread_ts || payload.ts })
  } catch (error) {
    await say({ text: (error as Error).message, thread_ts: payload.thread_ts || payload.ts })
    logger.error('Error', error)
  }
})

app.message(async ({ message, say, payload, event, context }) => {
  logger.log('message', payload, event)

  logger.log('message context', context)

  if (message.channel_type !== 'im' && message.channel_type !== 'mpim') return

  const teamId = context.teamId || context.enterpriseId
  if (!teamId) throw new Error('No teamId or enterpriseId found in context')
  const doc = await db.collection('teams').doc(teamId).get()
  const { token, model, personality } = (doc.data() || {}) as TeamConfig

  if (!token) {
    await say({
      text:
        'Your bot is not configured yet\n' +
        'You must set OpenAI api key with `/set_token` command\n' +
        '',
    })
    return
  }

  // get messages from conversation with bot
  const messageHistory = await app.client.conversations.history({
    token: context.botToken,
    channel: message.channel,
    limit: 10,
  })

  const conversation = (messageHistory.messages || [])
    .map(
      m =>
        ({
          role: m.bot_id ? 'assistant' : 'user',
          content: !m.bot_id ? (m.text || '').replace(/<@U\w+?>/, 'GPT bot').trim() : m.text,
        } as PromptMessage),
    )
    .filter(m => m.content)
    .reverse()

  try {
    const result = await askGPT4(conversation, token, model, personality)
    await say({ text: result })
    return
  } catch (error) {
    await say({ text: (error as Error).message })
    logger.error('Error', error)
  }
})

app.command('/set_token', setTokenCommand)
app.command('/set_model', setModelCommand)
app.command('/set_personality', setPersonality)

app.event('app_uninstalled', async ({ context }) => {
  logger.log('app_uninstalled', context)
  if (context.teamId) {
    const res1 = await db.collection('installations').doc(context.teamId).delete()
    await db.collection('teams').doc(context.teamId).delete()
    logger.log('uninstalled success', res1)
    return
  }
  if (context.enterpriseId) {
    await db.collection('installations').doc(context.enterpriseId).delete()
    await db.collection('teams').doc(context.enterpriseId).delete()
    return
  }
  throw new Error('No teamId or enterpriseId found in context')
})

export const slackbot = region('europe-west1').https.onRequest(expressReceiver.app)
