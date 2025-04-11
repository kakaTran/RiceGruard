'use server'

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateChatResponse(messages: any[], detectedDisease?: string | null) {
  try {
    // If this is the first message and we have a detected disease
    if (messages.length === 0 && detectedDisease) {
      const systemMessage = `You are a helpful assistant specializing in rice cultivation. The user has detected ${detectedDisease} in their rice plants. 
         Provide accurate, helpful information specifically related to rice cultivation, including symptoms, treatment, and prevention methods for this disease. 
         Be concise but informative. Format your response in a clear, easy-to-read way. Only respond to prompts related to rice plants.`

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `Tell me about ${detectedDisease} in rice plants.` }
        ],
        temperature: 0.7,
        max_tokens: 500,
      })

      return completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."
    }

    // For subsequent messages, use the chat history
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.7,
      max_tokens: 500,
    })

    return completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again."
  } catch (error) {
    console.error('Error generating chat response:', error)
    throw new Error('Failed to generate chat response')
  }
} 