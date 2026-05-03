'use client'

import { useState, useCallback, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { EnrollmentRequest } from '@/types'

// ─── Teacher: submit a request ─────────────────────────────────────────────────

interface SubmitEnrollInput {
  studentName: string
  classId: string
  parentPhone?: string
}

interface SubmitWithdrawInput {
  studentId: string
  classId: string
}

interface UseSubmitRequestReturn {
  submitEnroll: (input: SubmitEnrollInput) => Promise<void>
  submitWithdraw: (input: SubmitWithdrawInput) => Promise<void>
  loading: boolean
  error: string | null
  success: boolean
  reset: () => void
}

export function useSubmitEnrollmentRequest(): UseSubmitRequestReturn {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const reset = useCallback(() => {
    setError(null)
    setSuccess(false)
  }, [])

  const submitEnroll = useCallback(
    async ({ studentName, classId, parentPhone }: SubmitEnrollInput) => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not signed in.'); setLoading(false); return }

      const { error: dbErr } = await supabase.from('enrollment_requests').insert({
        type: 'enroll',
        student_class_id: classId,
        student_name: studentName.trim(),
        parent_phone: parentPhone?.trim() || null,
        requested_by: user.id,
      })

      if (dbErr) {
        setError(dbErr.message)
      } else {
        setSuccess(true)
      }
      setLoading(false)
    },
    [supabase]
  )

  const submitWithdraw = useCallback(
    async ({ studentId, classId }: SubmitWithdrawInput) => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not signed in.'); setLoading(false); return }

      const { error: dbErr } = await supabase.from('enrollment_requests').insert({
        type: 'withdraw',
        student_class_id: classId,
        student_id: studentId,
        requested_by: user.id,
      })

      if (dbErr) {
        setError(dbErr.message)
      } else {
        setSuccess(true)
      }
      setLoading(false)
    },
    [supabase]
  )

  return { submitEnroll, submitWithdraw, loading, error, success, reset }
}

// ─── Admin: fetch & review requests ───────────────────────────────────────────

interface UseAdminRequestsReturn {
  requests: EnrollmentRequest[]
  pendingCount: number
  loading: boolean
  error: string | null
  approve: (requestId: string) => Promise<void>
  reject: (requestId: string, reason?: string) => Promise<void>
  refresh: () => void
}

/** Row from enrollment_requests select with embedded classes/students only. */
interface EnrollmentJoinRow {
  id: string
  type: EnrollmentRequest['type']
  status: EnrollmentRequest['status']
  student_class_id: string
  student_id: string | null
  student_name: string | null
  parent_phone: string | null
  requested_by: string
  reviewed_by: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
  classes: { name: string } | null
  students: { full_name: string | null } | null
}

export function useAdminEnrollmentRequests(): UseAdminRequestsReturn {
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<EnrollmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false

    const fetchRequests = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchErr } = await supabase
        .from('enrollment_requests')
        .select(`
          *,
          classes ( name ),
          students ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return

      if (fetchErr) {
        setError(fetchErr.message)
        setLoading(false)
        return
      }

      // requested_by → auth.users; teacher display names live on user_profiles.id
      const rows = (data ?? []) as unknown as EnrollmentJoinRow[]
      const requestedByIds = [...new Set(rows.map(r => r.requested_by))]

      const nameByUserId = new Map<string, string>()
      if (requestedByIds.length > 0) {
        const { data: profiles, error: profilesErr } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', requestedByIds)

        if (cancelled) return

        if (profilesErr) {
          setError(profilesErr.message)
        } else {
          for (const p of profiles ?? []) {
            const label = typeof p.full_name === 'string' && p.full_name.length > 0
              ? p.full_name
              : '—'
            nameByUserId.set(p.id, label)
          }
        }
      }

      if (cancelled) return

      const mapped: EnrollmentRequest[] = rows.map(row => ({
        id: row.id,
        type: row.type,
        status: row.status,
        student_class_id: row.student_class_id,
        student_id: row.student_id ?? null,
        student_name: row.student_name ?? null,
        parent_phone: row.parent_phone ?? null,
        requested_by: row.requested_by,
        reviewed_by: row.reviewed_by ?? null,
        review_note: row.review_note ?? null,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at ?? null,
        class_name: row.classes?.name ?? '—',
        requester_name: nameByUserId.get(row.requested_by) ?? '—',
        existing_student_name: row.students?.full_name ?? undefined,
      }))

      setRequests(mapped)
      setLoading(false)
    }

    void fetchRequests()
    return () => { cancelled = true }
  }, [supabase, refreshKey])

  const approve = useCallback(
    async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: rpcErr } = await supabase.rpc('approve_enrollment_request', {
        p_request_id: requestId,
        p_reviewer_id: user.id,
      })

      if (rpcErr) throw new Error(rpcErr.message)
      refresh()
    },
    [supabase, refresh]
  )

  const reject = useCallback(
    async (requestId: string, reason?: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: rpcErr } = await supabase.rpc('reject_enrollment_request', {
        p_request_id: requestId,
        p_reviewer_id: user.id,
        p_reason: reason ?? null,
      })

      if (rpcErr) throw new Error(rpcErr.message)
      refresh()
    },
    [supabase, refresh]
  )

  return {
    requests,
    pendingCount: requests.filter(r => r.status === 'pending').length,
    loading,
    error,
    approve,
    reject,
    refresh,
  }
}
