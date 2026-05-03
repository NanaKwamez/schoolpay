'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import {
  UserPlus, UserMinus, CheckCircle2, XCircle,
  Clock, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdminEnrollmentRequests } from '@/hooks/useEnrollmentRequests'
import { cn } from '@/lib/utils'
import type { EnrollmentRequest } from '@/types'

// ─── Panel ─────────────────────────────────────────────────────────────────────

export function EnrollmentRequestsPanel() {
  const { requests, pendingCount, loading, error, approve, reject, refresh } =
    useAdminEnrollmentRequests()

  const [expanded, setExpanded] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<EnrollmentRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const pending  = requests.filter(r => r.status === 'pending')
  const reviewed = requests.filter(r => r.status !== 'pending')

  const handleApprove = useCallback(
    async (req: EnrollmentRequest) => {
      setActionLoading(req.id)
      setActionError(null)
      try {
        await approve(req.id)
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Failed to approve')
      } finally {
        setActionLoading(null)
      }
    },
    [approve]
  )

  const handleRejectConfirm = useCallback(async () => {
    if (!rejectTarget) return
    setActionLoading(rejectTarget.id)
    setActionError(null)
    try {
      await reject(rejectTarget.id, rejectReason.trim() || undefined)
      setRejectTarget(null)
      setRejectReason('')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }, [rejectTarget, rejectReason, reject])

  const toggleExpanded = useCallback(() => setExpanded(e => !e), [])

  const handleHeaderKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleExpanded()
      }
    },
    [toggleExpanded]
  )

  // Don't render the panel at all if there's nothing
  if (!loading && requests.length === 0 && !error) return null

  return (
    <>
      {/* ── Panel card ── */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header — div + role="button" avoids nested <button> with refresh */}
        <div
          onClick={toggleExpanded}
          onKeyDown={handleHeaderKeyDown}
          role="button"
          tabIndex={0}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100">
              <UserPlus className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Student Enrollment Requests</span>
            {pendingCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); refresh() }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100">
            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 px-4 py-3">{error}</p>
            )}

            {/* Action error */}
            {actionError && (
              <div className="mx-4 my-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {/* Loading skeletons */}
            {loading && (
              <div className="px-4 py-3 space-y-3">
                {[0, 1].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            )}

            {/* Pending requests */}
            {!loading && pending.length === 0 && (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <CheckCircle2 className="h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-400">No pending requests</p>
              </div>
            )}

            {!loading && pending.length > 0 && (
              <div className="divide-y divide-gray-50">
                {pending.map(req => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    onApprove={() => handleApprove(req)}
                    onReject={() => { setRejectTarget(req); setRejectReason('') }}
                    isLoading={actionLoading === req.id}
                  />
                ))}
              </div>
            )}

            {/* History toggle */}
            {!loading && reviewed.length > 0 && (
              <>
                <button
                  onClick={() => setShowHistory(h => !h)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 transition-colors"
                >
                  {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showHistory ? 'Hide' : 'Show'} {reviewed.length} reviewed request{reviewed.length !== 1 ? 's' : ''}
                </button>

                {showHistory && (
                  <div className="divide-y divide-gray-50 border-t border-gray-100">
                    {reviewed.map(req => (
                      <RequestRow key={req.id} req={req} readonly />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Reject reason modal ── */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Request"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setRejectTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={!!actionLoading}
              onClick={handleRejectConfirm}
            >
              Reject
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {rejectTarget && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
              <p className="font-semibold text-gray-800">
                {rejectTarget.type === 'enroll'
                  ? `Enrol "${rejectTarget.student_name}"`
                  : `Withdraw "${rejectTarget.existing_student_name}"`}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Requested by {rejectTarget.requester_name} · {rejectTarget.class_name}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Student is already registered under a different name…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 resize-none transition"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Request row ───────────────────────────────────────────────────────────────

function RequestRow({
  req,
  onApprove,
  onReject,
  isLoading = false,
  readonly = false,
}: {
  req: EnrollmentRequest
  onApprove?: () => void
  onReject?: () => void
  isLoading?: boolean
  readonly?: boolean
}) {
  const isEnroll   = req.type === 'enroll'
  const studentLabel = isEnroll
    ? req.student_name ?? '—'
    : req.existing_student_name ?? '—'

  const statusConfig = {
    pending:  { icon: <Clock className="h-3.5 w-3.5" />,        label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Approved', cls: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
  }
  const status = statusConfig[req.status]

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Type icon */}
          <div className={cn(
            'flex items-center justify-center h-8 w-8 rounded-lg shrink-0 mt-0.5',
            isEnroll ? 'bg-morning-green-100 text-morning-green-700' : 'bg-red-100 text-red-600'
          )}>
            {isEnroll
              ? <UserPlus className="h-4 w-4" />
              : <UserMinus className="h-4 w-4" />}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {isEnroll ? 'Enrol ' : 'Withdraw '}
              <span className="font-bold">{studentLabel}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {req.class_name} · by {req.requester_name}
            </p>
            {req.parent_phone && (
              <p className="text-xs text-gray-400">📞 {req.parent_phone}</p>
            )}
            {req.review_note && (
              <p className="text-xs text-gray-400 italic mt-0.5">"{req.review_note}"</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'flex items-center gap-1 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border',
          status.cls
        )}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Action buttons — only for pending & not readonly */}
      {!readonly && req.status === 'pending' && (
        <div className="flex gap-2 pl-10">
          <Button
            variant="success"
            size="sm"
            className="flex-1"
            loading={isLoading}
            onClick={onApprove}
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            disabled={isLoading}
            onClick={onReject}
            icon={<XCircle className="h-4 w-4" />}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
