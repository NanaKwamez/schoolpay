import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export async function generateText(prompt: string): Promise<string> {
  const client = getGeminiClient()
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}
