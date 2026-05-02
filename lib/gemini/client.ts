import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export function getGeminiModel() {
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export async function generateText(
  userMessage: string,
  systemPrompt: string,
  history?: { role: 'user' | 'model'; parts: string }[]
): Promise<string> {
  const model = getGeminiModel()
  const chat = model.startChat({
    history: (history ?? []).map(h => ({
      role: h.role,
      parts: [{ text: h.parts }],
    })),
    generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
  })
  const result = await chat.sendMessage(systemPrompt + '\n\n' + userMessage)
  return result.response.text()
}

export async function generateInsight(
  prompt: string,
  schoolData: Record<string, unknown>
): Promise<string> {
  const model = getGeminiModel()
  const fullPrompt = `School: Morning Glory Academy, Ghana.
Data: ${JSON.stringify(schoolData)}
Task: ${prompt}
Be concise (1-2 sentences). Use GHS for currency. Be specific with numbers.`
  const result = await model.generateContent(fullPrompt)
  return result.response.text()
}
