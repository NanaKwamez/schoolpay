import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateInsight } from '@/lib/gemini/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Auth check — allow service key bypass via header
    const authHeader = req.headers.get('Authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isServiceCall = serviceKey && authHeader === `Bearer ${serviceKey}`

    if (!isServiceCall) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['proprietress', 'headmaster'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Check cache validity
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

    // Fetch school data for insight generation
    const today = new Date().toISOString().split('T')[0]
    const termRes = await supabase.from('terms').select('id, term, year').eq('is_current', true).single()
    const termId = termRes.data?.id

    const [feedingRes, payRes] = await Promise.all([
      supabase.from('feeding_daily_log').select('status, student_id').eq('date', today ?? ''),
      termId
        ? supabase.from('payments').select('amount_paid, date_paid').eq('term_id', termId)
        : Promise.resolve({ data: [] }),
    ])

    const todayFeeding = feedingRes.data ?? []
    const payments = (payRes as { data: { amount_paid: number; date_paid: string }[] | null }).data ?? []

    // Build data for insights
    const paid = todayFeeding.filter((f: { status: string }) => f.status === 'paid').length
    const credit = todayFeeding.filter((f: { status: string }) => f.status === 'credit').length
    const absent = todayFeeding.filter((f: { status: string }) => f.status === 'absent').length
    const totalCollected = payments.reduce((s, p) => s + p.amount_paid, 0)

    const schoolData = {
      todayFeeding: { total: todayFeeding.length, paid, credit, absent },
      termCollected: totalCollected,
    }

    // Generate 3 insights
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

    // Delete old cache
    await supabase.from('ai_insights_cache').delete().lt('valid_until', now)

    // Insert new insights
    const { data: saved } = await supabase.from('ai_insights_cache').insert(insights).select()

    return NextResponse.json({ insights: saved ?? insights, fromCache: false })
  } catch (err) {
    console.error('[gemini/insights]', err)
    return NextResponse.json({ error: 'Could not generate insights' }, { status: 500 })
  }
}
