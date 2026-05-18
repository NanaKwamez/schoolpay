'use client'

/**
 * admin-settings-client — school settings; proprietress term rollover.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { logError } from '@/lib/logger'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface AdminSettingsClientProps {
  isProprietress: boolean
}

interface TermRow {
  id: string
  term: string
  year: number
  start_date: string
  end_date: string
  is_current: boolean
}

export function AdminSettingsClient({ isProprietress }: AdminSettingsClientProps) {
  const { showToast } = useToast()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [currentTerm, setCurrentTerm] = useState<TermRow | null>(null)
  const [loadingTerm, setLoadingTerm] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadTerm = useCallback(async () => {
    setLoadingTerm(true)
    const { data, error } = await supabase
      .from('terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('is_current', true)
      .maybeSingle()
    if (error) {
      logError('admin-settings.terms', error, {})
      showToast(error.message, 'error')
      setCurrentTerm(null)
    } else {
      setCurrentTerm(data as TermRow | null)
    }
    setLoadingTerm(false)
  }, [showToast, supabase])

  useEffect(() => {
    void loadTerm()
  }, [loadTerm])

  const nextTermLabel = useCallback((): { term: string; year: number } | null => {
    if (!currentTerm) return null
    const t = String(currentTerm.term)
    const y = Number(currentTerm.year)
    if (t === '3') return { term: '1', year: y + 1 }
    if (t === '1') return { term: '2', year: y }
    if (t === '2') return { term: '3', year: y }
    return null
  }, [currentTerm])

  const closeConfirm = useCallback(() => {
    if (!submitting) setShowConfirm(false)
  }, [submitting])

  const handleArchive = useCallback(async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/start-new-term', { method: 'POST' })
      const body = (await res.json()) as { error?: string; data?: unknown }
      if (!res.ok) {
        showToast(body.error ?? 'Could not start new term', 'error')
        return
      }
      showToast('New term started. Dashboards now use the new active term.', 'success')
      setShowConfirm(false)
      await loadTerm()
    } catch (e) {
      logError('admin-settings.start-term', e instanceof Error ? e : new Error('start term'), {})
      showToast('Request failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [loadTerm, showToast])

  const next = nextTermLabel()

  return (
    <div className="max-w-xl space-y-6 text-[#0A1628] dark:text-gray-100">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 p-4 text-sm leading-relaxed">
        <p className="font-bold text-amber-900 dark:text-amber-200">Preserve financial history</p>
        <p className="mt-2 text-amber-950/90 dark:text-amber-100/90">
          Do <strong>not</strong> manually delete database records. Use <strong>Start new term</strong> below
          to roll the active term forward while keeping all historical rows for audit.
        </p>
      </div>

      {loadingTerm ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading term…
        </p>
      ) : currentTerm ? (
        <p className="text-sm">
          <span className="font-semibold">Active term:</span> Term {currentTerm.term},{' '}
          {currentTerm.year} ({formatDate(String(currentTerm.start_date).slice(0, 10))} –{' '}
          {formatDate(String(currentTerm.end_date).slice(0, 10))})
        </p>
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">No active term is set. Contact support.</p>
      )}

      {isProprietress ? (
        <div>
          <button
            type="button"
            disabled={!currentTerm || !next}
            onClick={() => setShowConfirm(true)}
            className="rounded-xl bg-mga-green-dark px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Start new term
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Only the proprietress can archive the current term and start the next one.
        </p>
      )}

      <Modal
        isOpen={showConfirm}
        onClose={closeConfirm}
        title="Start new term?"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              disabled={submitting}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-600"
              onClick={closeConfirm}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              className="rounded-xl bg-mga-gold px-4 py-2 text-sm font-bold text-[#0A1628]"
              onClick={() => void handleArchive()}
            >
              {submitting ? 'Working…' : 'Archive & start new term'}
            </button>
          </div>
        }
      >
        {currentTerm && next ? (
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            This will archive Term {currentTerm.term} and start Term {next.term}. All previous data will be safely
            kept. The dashboard will reset to show the new term only.
          </p>
        ) : (
          <p className="text-sm text-gray-600">Unable to determine the next term.</p>
        )}
      </Modal>
    </div>
  )
}
