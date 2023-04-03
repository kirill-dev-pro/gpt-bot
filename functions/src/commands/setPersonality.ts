import { askGPT4 } from '../ai'
import { db } from '../db'
import { TeamConfig } from '../slackbot'
import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt'
import { logger } from 'firebase-functions/v1'

export const setPersonality: Middleware<SlackCommandMiddlewareArgs> = async ({
  command,
  ack,
  say,
  respond,
}) => {
  await ack()

  const personality = command.text.trim()
  try {
    await db.collection('teams').doc(command.team_id).set({ personality }, { merge: true })
  } catch (error) {
    logger.error('Error', error)
    await respond(`Error setting token: ${error}`)
    return
  }

  const doc = await db.collection('teams').doc(command.team_id).get()
  const { token, model } = doc.data() as TeamConfig

  if (!token) {
    await respond(`Please set token first`)
    return
  }

  await respond(`New bot personality: ${personality}`)
  try {
    const response = await askGPT4(
      [
        {
          role: 'assistant',
          content:
            `Tell to user that personality of the bot was successfully changed ` +
            `and tell who you are. Tell it shortly`,
        },
      ],
      token,
      model,
      personality,
    )
    await say(response)
  } catch (error) {
    await respond(
      'Oops, something went wrong. Please check your token and try again' + `Error: ${error}`,
    )
  }
}
