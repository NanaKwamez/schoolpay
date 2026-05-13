import { NextRequest, NextResponse } from 'next/server'
import { FUND_SUMMARY_VIEW_SELECT_COLUMNS } from '@/lib/constants'
import { generateText } from '@/lib/gemini/client'
import { buildSystemPrompt } from '@/lib/gemini/prompts'
import { logError } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type ChatHistoryItem = { role: 'user' | 'model'; parts: string }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['proprietress', 'headmaster'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as { message?: unknown; history?: ChatHistoryItem[] }
    const { message, history } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const [fundResult, feedingResult, debtResult, classResult, termResult] =
      await Promise.all([
        supabase.from('fund_summary').select(FUND_SUMMARY_VIEW_SELECT_COLUMNS),
        supabase.from('feeding_today_by_class').select('*'),
        supabase
          .from('students_in_debt')
          .select('student_name, class_name, total_outstanding')
          .order('total_outstanding', { ascending: false })
          .limit(5),
        supabase.from('classes').select('name').order('sort_order'),
        supabase.from('terms').select('*').eq('is_current', true).maybeSingle(),
      ])

    if (fundResult.error) {
      logError('api-gemini-fund-summary', fundResult.error)
    }
    if (feedingResult.error) {
      logError('api-gemini-feeding-today', feedingResult.error)
    }
    if (debtResult.error) {
      logError('api-gemini-students-in-debt', debtResult.error)
    }

    const funds = fundResult.data ?? []
    const feeding = feedingResult.data ?? []
    const debtors = debtResult.data ?? []
    const classes = classResult.data ?? []
    const term = termResult.data

    const totalStudents = feeding.reduce((s, c) => s + Number((c as { total_students?: number }).total_students ?? 0), 0)
    const totalPaid = feeding.reduce((s, c) => s + Number((c as { paid_count?: number }).paid_count ?? 0), 0)
    const totalCredit = feeding.reduce((s, c) => s + Number((c as { credit_count?: number }).credit_count ?? 0), 0)
    const totalAbsent = feeding.reduce((s, c) => s + Number((c as { absent_count?: number }).absent_count ?? 0), 0)

    const totalExpected = funds.reduce((s, f) => s + Number((f as { payment_income?: number }).payment_income ?? 0), 0)
    const totalCollected = funds.reduce((s, f) => s + Number((f as { total_income?: number }).total_income ?? 0), 0)
    const totalOutstanding = Math.max(0, totalExpected - totalCollected)

    const systemPrompt = buildSystemPrompt({
      termStats: {
        expected: totalExpected,
        collected: totalCollected,
        outstanding: totalOutstanding,
      },
      todayFeeding: {
        totalStudents,
        paid: totalPaid,
        credit: totalCredit,
        absent: totalAbsent,
      },
      topDebtors: debtors.map(d => ({
        name: String((d as { student_name: string }).student_name ?? ''),
        class: String((d as { class_name: string }).class_name ?? ''),
        amount: Number((d as { total_outstanding: number }).total_outstanding ?? 0),
      })),
      classNames: classes.map(c => (c as { name: string }).name),
      currentTerm: term?.term ?? '1',
      currentYear: term?.year ?? new Date().getFullYear(),
    })

    const safeHistory = Array.isArray(history)
      ? history.filter(
          (h): h is ChatHistoryItem =>
            h != null &&
            (h.role === 'user' || h.role === 'model') &&
            typeof h.parts === 'string'
        )
      : undefined

    const response = await generateText(message, systemPrompt, safeHistory)

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logError('api-gemini-route', error)
    return NextResponse.json(
      { error: 'Could not get AI response', code: 'GEMINI_FAILED' },
      { status: 500 }
    )
  }
}
