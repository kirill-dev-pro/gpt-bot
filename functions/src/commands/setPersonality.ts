import { askAI } from '../ai'
import { db, getTeamData } from '../db'
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

  const teamData = await getTeamData(command.team_id)

  if (!teamData) {
    await respond(`Error setting personality: no team data`)
    return
  }

  await respond(`New bot personality: ${personality}`)
  try {
    const response = await askAI(
      [
        {
          role: 'assistant',
          content:
            `Tell to user that personality of the bot was successfully changed ` +
            `and tell who you are. Tell it shortly`,
        },
      ],
      command.team_id,
    )
    await say(response)
  } catch (error) {
    await respond(`Error: ${error}`)
  }
}
