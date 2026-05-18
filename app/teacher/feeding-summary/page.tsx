import { redirect } from 'next/navigation'

import { TeacherFeedingSummaryView } from '@/components/teacher/teacher-feeding-summary-view'
import { SCHOOL_NAME } from '@/lib/constants'
import {
  fetchTeacherFeedingSummaryRepo,
  type TeacherFeedingSummaryRepoPayload,
} from '@/lib/repositories/teacher-feeding-summary-repository'
import { buildTeacherFeedingSummaryViewModel } from '@/lib/services/teacher-feeding-summary-service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: `Feeding income — ${SCHOOL_NAME}` }

const EMPTY_PAYLOAD: TeacherFeedingSummaryRepoPayload = {
  profile: { class_id: null, role: 'teacher' as UserRole },
  term: null,
  className: null,
  students: [],
  logs: [],
  submissions: [],
}

export default async function TeacherFeedingSummaryPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await fetchTeacherFeedingSummaryRepo(supabase, user.id)
  if (error === 'not_teacher') {
    redirect('/admin/dashboard')
  }

  const payload = data ?? EMPTY_PAYLOAD
  const model = buildTeacherFeedingSummaryViewModel(payload)

  return (
    <TeacherFeedingSummaryView
      model={model}
      loadError={error != null && data == null && error !== 'not_teacher' ? error : null}
    />
  )
}
