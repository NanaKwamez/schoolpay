/** Google Gemini client — generative model + text chat for SchoolPay */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SCHOOL_NAME } from '@/lib/constants'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export function getGeminiModel(modelName = 'gemini-2.5-flash') {
  return genAI.getGenerativeModel({ model: modelName })
}

export async function generateText(
  userMessage: string,
  systemPrompt: string,
  history?: { role: 'user' | 'model'; parts: string }[]
): Promise<string> {
  try {
    const model = getGeminiModel()
    const chat = model.startChat({
      history:
        history?.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }],
        })) ?? [],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.3 },
    })
    const fullPrompt = `${systemPrompt}\n\n${userMessage}`
    const result = await chat.sendMessage(fullPrompt)
    return result.response.text()
  } catch (error) {
    console.error('Gemini generateText error:', error)
    throw error
  }
}

export async function generateInsight(
  prompt: string,
  schoolData: Record<string, unknown>
): Promise<string> {
  const model = getGeminiModel()
  const fullPrompt = `School: ${SCHOOL_NAME}, Ghana.
Data: ${JSON.stringify(schoolData)}
Task: ${prompt}
Be concise (1-2 sentences). Use GHS for currency. Be specific with numbers.`
  const result = await model.generateContent(fullPrompt)
  return result.response.text()
}
