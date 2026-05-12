import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { generateInsight } from '@/lib/gemini/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function resolveSupabaseForInsights(
  req: NextRequest
): Promise<
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.INSIGHTS_CRON_SECRET

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    try {
      return { ok: true, supabase: createSupabaseAdminClient() }
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Cron misconfigured on server' }, { status: 500 }),
      }
    }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['proprietress', 'headmaster'].includes(profile.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, supabase }
}

export async function POST(req: NextRequest) {
  try {
    const resolved = await resolveSupabaseForInsights(req)
    if (!resolved.ok) return resolved.response
    const supabase = resolved.supabase

    const now = new Date().toISOString()
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('*')
      .gt('valid_until', now)
      .order('generated_at', { ascending: false })
      .limit(3)

    if (cached && cached.length >= 3) {
      return NextResponse.json({ insights: cached, fromCache: true })
    }

    const today = new Date().toISOString().split('T')[0]
    const termRes = await supabase.from('terms').select('id, term, year').eq('is_current', true).single()
    const termId = termRes.data?.id

    type PaymentRow = { amount_paid: number; date_paid: string }

    const [feedingRes, payRes] = await Promise.all([
      supabase.from('feeding_daily_log').select('status, student_id').eq('date', today ?? ''),
      termId
        ? supabase.from('payments').select('amount_paid, date_paid').eq('term_id', termId)
        : Promise.resolve({ data: [] as PaymentRow[] }),
    ])

    const todayFeeding = feedingRes.data ?? []
    const paymentRows = payRes.data ?? []

    const paid = todayFeeding.filter((f: { status: string }) => f.status === 'paid').length
    const credit = todayFeeding.filter((f: { status: string }) => f.status === 'credit').length
    const absent = todayFeeding.filter((f: { status: string }) => f.status === 'absent').length
    const totalCollected = paymentRows.reduce((s, p) => s + p.amount_paid, 0)

    const schoolData = {
      todayFeeding: { total: todayFeeding.length, paid, credit, absent },
      termCollected: totalCollected,
    }

    const [anomaly, trend, forecast] = await Promise.all([
      generateInsight(
        'In 1 sentence, identify the most unusual thing about today\'s feeding data. Be specific with numbers.',
        { ...schoolData, type: 'anomaly' }
      ),
      generateInsight(
        'In 1 sentence, describe the feeding fee collection trend. Use percentages if helpful.',
        { ...schoolData, type: 'trend' }
      ),
      generateInsight(
        'In 1 sentence, forecast total feeding fee collection by end of term based on the current collection rate.',
        { ...schoolData, type: 'forecast' }
      ),
    ])

    const validUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    const generatedAt = new Date().toISOString()

    const insights = [
      { insight_type: 'anomaly', content: anomaly, generated_at: generatedAt, valid_until: validUntil },
      { insight_type: 'trend', content: trend, generated_at: generatedAt, valid_until: validUntil },
      { insight_type: 'forecast', content: forecast, generated_at: generatedAt, valid_until: validUntil },
    ]

    await supabase.from('ai_insights_cache').delete().lt('valid_until', now)

    const { data: saved } = await supabase.from('ai_insights_cache').insert(insights).select()

    return NextResponse.json({ insights: saved ?? insights, fromCache: false })
  } catch (err) {
    console.error('[gemini/insights]', err)
    return NextResponse.json(
      { error: 'Could not generate insights', code: 'INSIGHTS_FAILED' },
      { status: 500 }
    )
  }
}
