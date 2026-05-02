import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/gemini/client'
import { buildChatSystemPrompt, buildFinanceInsightPrompt } from '@/lib/gemini/prompts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.type === 'insight' && body.data) {
      const prompt = buildFinanceInsightPrompt(body.data)
      const reply = await generateText(prompt)
      return NextResponse.json({ reply })
    }

    if (body.message) {
      const systemPrompt = buildChatSystemPrompt()
      const historyText = (body.history ?? [])
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')
      const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${historyText}\n\nUser: ${body.message}\nAssistant:`
      const reply = await generateText(fullPrompt)
      return NextResponse.json({ reply })
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
