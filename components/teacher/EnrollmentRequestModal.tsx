'use client'

import { useState, useEffect } from 'react'
import { UserPlus, UserMinus, CheckCircle2, AlertCircle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { db } from '@/lib/dexie/schema'
import { useSubmitEnrollmentRequest } from '@/hooks/useEnrollmentRequests'
import { cn } from '@/lib/utils'

type RequestMode = 'enroll' | 'withdraw'

interface Props {
  isOpen: boolean
  onClose: () => void
  classId: string
  className?: string
}

export function EnrollmentRequestModal({ isOpen, onClose, classId, className }: Props) {
  const [mode, setMode] = useState<RequestMode>('enroll')

  // Enroll fields
  const [studentName, setStudentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  // Withdraw field
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const { submitEnroll, submitWithdraw, loading, error, success, reset } =
    useSubmitEnrollmentRequest()

  // Load active students from Dexie for the withdraw dropdown
  const students = useLiveQuery(
    async () => {
      if (!classId) return []
      return db.students
        .where('class_id').equals(classId)
        .filter(s => s.is_active)
        .sortBy('full_name')
    },
    [classId],
    []
  )

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setStudentName('')
      setParentPhone('')
      setSelectedStudentId('')
      reset()
    }
  }, [isOpen, reset])

  useEffect(() => {
    setStudentName('')
    setParentPhone('')
    setSelectedStudentId('')
    reset()
  }, [mode, reset])

  const handleSubmit = async () => {
    if (mode === 'enroll') {
      if (!studentName.trim()) return
      await submitEnroll({ studentName, classId, parentPhone })
    } else {
      if (!selectedStudentId) return
      await submitWithdraw({ studentId: selectedStudentId, classId })
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Student Enrollment Request"
      className={className}
      footer={
        !success ? (
          <Button
            variant="primary"
            fullWidth
            loading={loading}
            disabled={
              loading ||
              (mode === 'enroll' ? !studentName.trim() : !selectedStudentId)
            }
            onClick={handleSubmit}
          >
            Send Request to Headmaster
          </Button>
        ) : (
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Close
          </Button>
        )
      }
    >
      {success ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <div className="h-16 w-16 rounded-full bg-mga-green-pale flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-mga-green-mid" />
          </div>
          <p className="font-bold text-gray-900 text-lg">Request Sent!</p>
          <p className="text-gray-500 text-sm max-w-xs">
            {mode === 'enroll'
              ? 'Your request to enrol a new student has been sent. The headmaster will review and approve it.'
              : 'Your request to withdraw a student has been sent. The headmaster will review it before any changes are made.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Mode selector ── */}
          <div className="grid grid-cols-2 gap-3">
            <ModeCard
              active={mode === 'enroll'}
              icon={<UserPlus className="h-5 w-5" />}
              label="Enrol New Student"
              description="Add a student joining your class"
              onClick={() => setMode('enroll')}
            />
            <ModeCard
              active={mode === 'withdraw'}
              icon={<UserMinus className="h-5 w-5" />}
              label="Withdraw Student"
              description="Remove a student who has left"
              onClick={() => setMode('withdraw')}
              danger
            />
          </div>

          {/* ── Fields ── */}
          {mode === 'enroll' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Student Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Kwame Agyeman"
                  className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-mga-green-mid transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Parent Phone (optional)
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={e => setParentPhone(e.target.value)}
                  placeholder="e.g. 0241234567"
                  className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-mga-green-mid transition"
                />
              </div>
              <p className="text-xs text-gray-400 bg-mga-green-pale rounded-xl px-3 py-2 leading-relaxed">
                The headmaster will verify and approve before the student is added to the system.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Select Student to Withdraw <span className="text-red-500">*</span>
                </label>
                {!students || students.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">
                    No active students found in your class.
                  </p>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full min-h-[48px] border-2 border-gray-200 rounded-xl px-4 py-2.5 text-base outline-none focus:border-mga-green-mid transition bg-white"
                  >
                    <option value="">— Choose student —</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                This will only deactivate the student after headmaster approval. Their payment history is preserved.
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Mode card ─────────────────────────────────────────────────────────────────

function ModeCard({
  active, icon, label, description, onClick, danger = false,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1.5 p-3 rounded-2xl border-2 text-left transition-all w-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light',
        active && !danger && 'border-mga-green-mid bg-mga-green-pale',
        active && danger  && 'border-red-400 bg-red-50',
        !active           && 'border-mga-gold/20 bg-white hover:bg-mga-green-pale/50'
      )}
    >
      <span className={cn(
        'flex items-center justify-center h-9 w-9 rounded-xl',
        active && !danger && 'bg-mga-green-pale text-mga-green-dark',
        active && danger  && 'bg-red-100 text-red-600',
        !active           && 'bg-mga-cream-dark text-gray-500'
      )}>
        {icon}
      </span>
      <p className={cn(
        'text-sm font-bold leading-tight',
        active && !danger && 'text-mga-green-dark',
        active && danger  && 'text-red-700',
        !active           && 'text-gray-700'
      )}>
        {label}
      </p>
      <p className="text-xs text-gray-400 leading-snug">{description}</p>
    </button>
  )
}
