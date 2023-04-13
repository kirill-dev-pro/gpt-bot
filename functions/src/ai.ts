import { getTeamData, setTokensLeft } from './db'
import { config, logger } from 'firebase-functions/v1'

const gpt4APIUrl = 'https://api.openai.com/v1/chat/completions'

export type PromptMessage = {
  role: 'user' | 'system' | 'assistant'
  content: string
  name?: string
}

const globalToken = config().openai.key

export async function askAI(context: PromptMessage[], teamId: string) {
  if (!teamId) {
    throw new Error('Team ID is required')
  }
  const teamData = await getTeamData(teamId)

  if (!teamData) {
    throw new Error('Your bot is not configured yet')
  }
  const { token, personality, model, tokensLeft } = teamData

  if (!token && tokensLeft < 0) {
    throw new Error(
      'Your monthly limit is over, please contact developer to upgrade your plan ' +
        'or set your own OpenAI token',
    )
  }

  const messages = [
    {
      role: 'system',
      content:
        `You are "GPT bot", an AI that lives inside Slack workspace\n` +
        `Your abilities: answer when mentioned in thread with its context\n` +
        'and respond in personal messages\n' +
        'This is how user describe your personality:\n' +
        personality,
    },
    ...context,
  ]
  const gpt4Response = await fetch(gpt4APIUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || globalToken}`,
    },
    body: JSON.stringify({
      messages,
      max_tokens: 256,
      temperature: 1,
      model,
    }),
  }).then(res => res.json())

  if (gpt4Response.choices && gpt4Response.choices.length > 0) {
    const gpt4Answer = gpt4Response.choices[0].message.content

    if (!token) {
      const usage = gpt4Response.usage.total_tokens
      await setTokensLeft(teamId, tokensLeft - usage)
    }

    return gpt4Answer as string
  } else if (gpt4Response.error && gpt4Response.error.message) {
    return gpt4Response.error.message as string
  } else {
    logger.error('GPT response', gpt4Response)
    throw new Error('No answer')
  }
}
