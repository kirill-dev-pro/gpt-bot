import { askGPT4 } from '../ai'
import { db } from '../db'
import { TeamConfig } from '../slackbot'
import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt'
import { logger } from 'firebase-functions/v1'

export const setModelCommand: Middleware<SlackCommandMiddlewareArgs> = async ({
  command,
  ack,
  say,
  respond,
}) => {
  await ack()
  const model = command.text.trim()
  try {
    await db.collection('teams').doc(command.team_id).set({ model }, { merge: true })
  } catch (error) {
    logger.error('Error', error)
    await respond(`Error setting model: ${error}`)
    return
  }

  const doc = await db.collection('teams').doc(command.team_id).get()
  const { token, personality } = doc.data() as TeamConfig

  if (!token) {
    await respond(`Please set token first`)
    return
  }

  try {
    const response = await askGPT4(
      [
        {
          role: 'assistant',
          content:
            `Tell to user that model was set successfully and everything works ok.\n` +
            `Tell it shortly\n`,
        },
      ],
      token,
      model,
      personality,
    )
    await respond('OpenAI model set successfully. New model: ' + model)
    await say(response)
  } catch (error) {
    await respond('Error setting model: ' + error)
  }
}
