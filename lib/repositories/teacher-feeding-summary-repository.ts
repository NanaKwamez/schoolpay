/**
 * teacher-feeding-summary-repository — Supabase reads for the teacher feeding income page.
 */

import { logError } from '@/lib/logger'
import type { FeedingStatus, UserRole } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TeacherProfileClassRow {
  class_id: string | null
  role: UserRole
}

export interface CurrentTermRow {
  id: string
  term: string
  year: number
  start_date: string
  end_date: string
}

export interface ClassNameRow {
  name: string
}

export interface StudentIdNameRow {
  id: string
  full_name: string
}

export interface FeedingDailyLogRow {
  student_id: string
  date: string
  status: FeedingStatus
  amount: number | string | null
}

export interface ClassDailySubmissionRow {
  date: string
  submitted_at: string
}

export interface TeacherFeedingSummaryRepoPayload {
  profile: TeacherProfileClassRow
  term: CurrentTermRow | null
  className: string | null
  students: StudentIdNameRow[]
  logs: FeedingDailyLogRow[]
  submissions: ClassDailySubmissionRow[]
}

export async function fetchTeacherFeedingSummaryRepo(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: TeacherFeedingSummaryRepoPayload | null; error: string | null }> {
  const { data: profile, error: pErr } = await supabase
    .from('user_profiles')
    .select('class_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (pErr) {
    logError('teacher-feeding-summary-repo.profile', pErr, { userId })
    return { data: null, error: pErr.message }
  }

  if (!profile || profile.role !== 'teacher') {
    return { data: null, error: 'not_teacher' }
  }

  const teacherProfile = profile as TeacherProfileClassRow

  const classId = teacherProfile.class_id
  if (!classId) {
    return {
      data: {
        profile: teacherProfile,
        term: null,
        className: null,
        students: [],
        logs: [],
        submissions: [],
      },
      error: null,
    }
  }

  const [{ data: term, error: tErr }, { data: cls, error: cErr }, { data: students, error: sErr }] =
    await Promise.all([
      supabase
        .from('terms')
        .select('id, term, year, start_date, end_date')
        .eq('is_current', true)
        .maybeSingle(),
      supabase.from('classes').select('name').eq('id', classId).maybeSingle(),
      supabase
        .from('students')
        .select('id, full_name')
        .eq('class_id', classId)
        .eq('is_active', true),
    ])

  if (tErr) {
    logError('teacher-feeding-summary-repo.terms', tErr, { userId, classId })
    return { data: null, error: tErr.message }
  }
  if (cErr) {
    logError('teacher-feeding-summary-repo.classes', cErr, { classId })
    return { data: null, error: cErr.message }
  }
  if (sErr) {
    logError('teacher-feeding-summary-repo.students', sErr, { classId })
    return { data: null, error: sErr.message }
  }

  const studentList = (students ?? []) as StudentIdNameRow[]
  const ids = studentList.map(s => s.id)

  if (!term || ids.length === 0) {
    return {
      data: {
        profile: teacherProfile,
        term: term as CurrentTermRow | null,
        className: (cls as ClassNameRow | null)?.name ?? null,
        students: studentList,
        logs: [],
        submissions: [],
      },
      error: null,
    }
  }

  const termRow = term as CurrentTermRow
  const start = String(termRow.start_date).slice(0, 10)
  const end = String(termRow.end_date).slice(0, 10)

  const { data: logs, error: lErr } = await supabase
    .from('feeding_daily_log')
    .select('student_id, date, status, amount')
    .in('student_id', ids)
    .gte('date', start)
    .lte('date', end)

  if (lErr) {
    logError('teacher-feeding-summary-repo.feeding_daily_log', lErr, { classId, start, end })
    return { data: null, error: lErr.message }
  }

  const logRows = (logs ?? []) as FeedingDailyLogRow[]

  const { data: subs, error: subErr } = await supabase
    .from('class_daily_submissions')
    .select('date, submitted_at')
    .eq('class_id', classId)
    .gte('date', start)
    .lte('date', end)

  if (subErr) {
    logError('teacher-feeding-summary-repo.class_daily_submissions', subErr, {
      classId,
      start,
      end,
    })
    return { data: null, error: subErr.message }
  }
  const submissionRows = (subs ?? []) as ClassDailySubmissionRow[]

  return {
    data: {
      profile: teacherProfile,
      term: termRow,
      className: (cls as ClassNameRow | null)?.name ?? null,
      students: studentList,
      logs: logRows,
      submissions: submissionRows,
    },
    error: null,
  }
}
