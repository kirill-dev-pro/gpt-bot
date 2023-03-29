import { logger } from 'firebase-functions/v1'

const gpt4APIUrl = 'https://api.openai.com/v1/chat/completions'

export type PromptMessage = {
  role: 'user' | 'system' | 'assistant'
  content: string
  name?: string
}

export async function askGPT4(
  context: PromptMessage[],
  token: string,
  model: string = 'gpt-3.5-turbo',
  personality: string = 'You are funny and sarcastic coworker in a small startup',
) {
  const messages = [
    {
      role: 'system',
      content:
        `You are "GPT bot" and you letting user know about changes in your configuration\n` +
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
      Authorization: `Bearer ${token}`,
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
    return gpt4Answer as string
  } else if (gpt4Response.error && gpt4Response.error.message) {
    return gpt4Response.error.message as string
  } else {
    logger.error('GPT response', gpt4Response)
    throw new Error('No answer')
  }
}
