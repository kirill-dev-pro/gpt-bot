import { askAI } from '../ai'
import { db } from '../db'
import { Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt'
import { logger } from 'firebase-functions/v1'

export const setTokenCommand: Middleware<SlackCommandMiddlewareArgs> = async ({
  command,
  ack,
  say,
  respond,
}) => {
  await ack()
  // example openai key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  // create regex to check if string is a valid key
  const openaiKeyRegex = /sk-[a-zA-Z0-9]{48}/
  // find key in message
  const key = command.text.substring(command.text.indexOf('sk-'), command.text.indexOf('sk-') + 51)

  if (!openaiKeyRegex.test(key) || !key || command.text.indexOf('sk-') === -1) {
    await respond(`Invalid token`)
    return
  }
  // save token to firestore db
  const token = command.text.trim()
  try {
    await db
      .collection('teams')
      .doc(command.team_id)
      .set({ token: command.text.trim() }, { merge: true })
  } catch (error) {
    logger.error('Error', error)
    await respond(`Error setting token: ${error}`)
    return
  }

  await respond(`Token set`)
  try {
    const response = await askAI(
      [
        {
          role: 'assistant',
          content:
            `Tell to user that configuration token was successfully set and he can start using bot.\n` +
            `Add a small joke and tell briefly about your abilities\n`,
        },
      ],
      token,
    )
    await say(response)
  } catch (error) {
    await respond(`Error: ${error}`)
    await say('Oops, something went wrong. Please check your token and try again')
  }
}
