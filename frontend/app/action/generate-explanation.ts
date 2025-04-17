"use server"

import OpenAI from 'openai'; // Import OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use the API key from environment variables
});

export async function generateExplanation(messages: { role: string; content: string }[]): Promise<string> {
  if (!messages || messages.length === 0) {
    return "No disease detected. The rice leaf appears healthy or no specific disease patterns were identified.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const data = response.choices[0]?.message?.content; // Adjusted to access the response correctly
    return data || "No detailed information available.";
  } catch (error) {
    console.error("Error fetching explanation from xAI API:", error);
    return "Unable to fetch disease information at this time.";
  }
}