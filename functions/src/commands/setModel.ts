import { askAI } from '../ai'
import { db, getTeamData } from '../db'
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

  const teamData = await getTeamData(command.team_id)

  if (!teamData?.token) {
    await respond(`You can not change model without setting your own token first`)
    return
  }

  try {
    const response = await askAI(
      [
        {
          role: 'assistant',
          content:
            `Tell to user that model was set successfully and everything works ok.\n` +
            `Tell it shortly\n`,
        },
      ],
      command.team_id,
    )
    await respond('OpenAI model set successfully. New model: ' + model)
    await say(response)
  } catch (error) {
    await respond('Error setting model: ' + error)
  }
}
