import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    school: 'Morning Glory Academy',
    ai_provider: 'google_gemini',
    timestamp: new Date().toISOString(),
  })
}
