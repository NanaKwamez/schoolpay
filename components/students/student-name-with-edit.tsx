'use client'

/**
 * student-name-with-edit — display name with pencil / long-press to correct spelling.
 */

import { Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  STUDENT_FULL_NAME_MAX_LENGTH,
  STUDENT_FULL_NAME_MIN_LENGTH,
  STUDENT_NAME_LONG_PRESS_MS,
  WRAP_LONG_TEXT_CLASS,
} from '@/lib/constants'
import { updateStudentFullName } from '@/lib/services/update-student-name-service'
import { cn } from '@/lib/utils'
import { validateStudentFullName } from '@/lib/validation'

interface StudentNameWithEditProps {
  studentId: string
  fullName: string
  onSaved?: (fullName: string) => void
  nameClassName?: string
}

export function StudentNameWithEdit({
  studentId,
  fullName,
  onSaved,
  nameClassName,
}: StudentNameWithEditProps) {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(fullName)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pressTimerRef = useRef<number | null>(null)

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current == null) return
    window.clearTimeout(pressTimerRef.current)
    pressTimerRef.current = null
  }, [])

  const openModal = useCallback(() => {
    setDraft(fullName)
    setIsOpen(true)
  }, [fullName])

  const closeModal = useCallback(() => {
    if (isSaving) return
    setIsOpen(false)
  }, [isSaving])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      clearPressTimer()
      pressTimerRef.current = window.setTimeout(() => {
        openModal()
      }, STUDENT_NAME_LONG_PRESS_MS)
    },
    [clearPressTimer, openModal]
  )

  useEffect(() => () => clearPressTimer(), [clearPressTimer])

  useEffect(() => {
    if (!isOpen) return
    setDraft(fullName)
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [isOpen, fullName])

  const parsed = validateStudentFullName(draft)
  const canSave = parsed.ok && parsed.value !== fullName.trim()

  const handleSave = useCallback(async () => {
    const next = validateStudentFullName(draft)
    if (!next.ok) return
    setIsSaving(true)
    try {
      const result = await updateStudentFullName(studentId, next.value)
      if (!result.ok) {
        showToast(result.error, 'error')
        return
      }
      showToast('Name updated successfully', 'success')
      onSaved?.(result.fullName)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }, [draft, onSaved, showToast, studentId])

  return (
    <>
      <span className="flex min-w-0 max-w-full items-start gap-1">
        <span
          className={cn('min-w-0 flex-1', WRAP_LONG_TEXT_CLASS, nameClassName)}
          onPointerDown={handlePointerDown}
          onPointerUp={clearPressTimer}
          onPointerCancel={clearPressTimer}
          onPointerLeave={clearPressTimer}
          onContextMenu={event => event.preventDefault()}
        >
          {fullName}
        </span>
        <button
          type="button"
          onClick={event => {
            event.stopPropagation()
            openModal()
          }}
          aria-label={`Edit name for ${fullName}`}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md mt-0.5',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'dark:hover:bg-gray-700 dark:hover:text-gray-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light'
          )}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Edit Student Name"
        overlayClassName="z-[70]"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={isSaving}
              disabled={!canSave || isSaving}
              onClick={() => void handleSave()}
            >
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{fullName}</p>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              minLength={STUDENT_FULL_NAME_MIN_LENGTH}
              maxLength={STUDENT_FULL_NAME_MAX_LENGTH}
              autoComplete="name"
              aria-label="New student name"
              className={cn(
                'w-full min-h-[48px] rounded-xl border-2 border-gray-200 pr-12 pl-3',
                'text-sm capitalize outline-none focus:border-mga-green-mid',
                'dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              )}
            />
            <button
              type="button"
              onClick={() => setDraft('')}
              aria-label="Clear name"
              className="absolute right-2 top-1/2 flex h-9 w-9 shrink-0 -translate-y-1/2 items-center justify-center text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!parsed.ok && draft.trim().length > 0 && (
            <p className="text-xs text-red-600">{parsed.error}</p>
          )}
        </div>
      </Modal>
    </>
  )
}
