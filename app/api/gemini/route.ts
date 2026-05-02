import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/gemini/client'
import { buildSystemPrompt } from '@/lib/gemini/prompts'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['proprietress', 'headmaster'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as {
      message: string
      history?: { role: 'user' | 'model'; parts: string }[]
    }

    if (!body.message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // Fetch school data for system prompt
    const today = new Date().toISOString().split('T')[0]

    const [termRes, feedingRes, classRes] = await Promise.all([
      supabase.from('terms').select('id, term, year').eq('is_current', true).single(),
      supabase.from('feeding_daily_log').select('status').eq('date', today ?? ''),
      supabase.from('classes').select('name').order('sort_order'),
    ])

    const termData = termRes.data
    const feedingLogs = feedingRes.data ?? []
    const classNames = (classRes.data ?? []).map((c: { name: string }) => c.name)

    const termStats = { expected: 0, collected: 0, outstanding: 0 }
    if (termData) {
      const [payRes, feeRes] = await Promise.all([
        supabase.from('payments').select('amount_paid').eq('term_id', termData.id),
        supabase.from('student_fee_assignments').select('fee_types(amount)').eq('term_id', termData.id).eq('is_active', true),
      ])
      const collected = (payRes.data ?? []).reduce((s: number, p: { amount_paid: number }) => s + p.amount_paid, 0)
      const expected = (feeRes.data ?? []).reduce((s: number, a: { fee_types: unknown }) => {
        const ft = a.fee_types as { amount: number } | null
        return s + (ft?.amount ?? 0)
      }, 0)
      termStats.expected = expected
      termStats.collected = collected
      termStats.outstanding = Math.max(0, expected - collected)
    }

    const paid = feedingLogs.filter((f: { status: string }) => f.status === 'paid').length
    const credit = feedingLogs.filter((f: { status: string }) => f.status === 'credit').length
    const absent = feedingLogs.filter((f: { status: string }) => f.status === 'absent').length

    const systemPrompt = buildSystemPrompt({
      termStats,
      todayFeeding: { totalStudents: feedingLogs.length, paid, credit, absent },
      topDebtors: [],
      classNames,
      currentTerm: termData?.term ?? '1',
      currentYear: termData?.year ?? new Date().getFullYear(),
      recentPayments: [],
    })

    const response = await generateText(body.message, systemPrompt, body.history)

    return NextResponse.json({ response, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[gemini/route]', err)
    return NextResponse.json({ error: 'Could not get AI response' }, { status: 500 })
  }
}
