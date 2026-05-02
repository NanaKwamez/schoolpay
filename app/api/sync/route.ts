import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sync endpoint ready',
    timestamp: new Date().toISOString(),
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sync processed',
    timestamp: new Date().toISOString(),
  })
}
