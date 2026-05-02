'use client'

import { useState } from 'react'
import { Save, Tag, Calendar, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassInputWrapper } from '@/components/ui/GlassInput'
import type { FeeFrequency } from './FeeCard'

const ALL_CLASSES = [
  'Creche', 'Nursery 1', 'Nursery 2',
  'KG 1', 'KG 2',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JHS 1', 'JHS 2', 'JHS 3',
]

interface FeeFormProps {
  /** Pre-fill values when editing an existing fee */
  initialValues?: {
    name: string
    amount: string
    frequency: FeeFrequency
    term: string
    appliesTo: string[]
  }
  onSave: (values: {
    name: string
    amount: string
    frequency: FeeFrequency
    term: string
    appliesTo: string[]
  }) => void
  loading?: boolean
}

/**
 * FeeForm — add/edit fee type form from the Stitch fee management screen.
 *
 * Sticky glass panel with name, amount, frequency select, term select,
 * and class multi-select checkboxes.
 */
export function FeeForm({ initialValues, onSave, loading }: FeeFormProps) {
  const [name, setName]         = useState(initialValues?.name       ?? '')
  const [amount, setAmount]     = useState(initialValues?.amount     ?? '')
  const [frequency, setFreq]    = useState<FeeFrequency>(initialValues?.frequency ?? 'Termly')
  const [term, setTerm]         = useState(initialValues?.term       ?? 'all')
  const [appliesTo, setApplies] = useState<string[]>(initialValues?.appliesTo ?? [])

  function toggleClass(cls: string) {
    setApplies(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ name, amount, frequency, term, appliesTo })
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8 sticky top-4">
      <h3 className="text-xl font-semibold text-[var(--color-ds-on-surface)] mb-6 pb-4 border-b border-[var(--color-ds-outline-variant)]/30 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-[var(--color-ds-primary)]" />
        Add / Edit Fee
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Fee name */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] uppercase">
            Fee Name
          </span>
          <GlassInputWrapper leadingIcon={<Tag className="w-4 h-4" />}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Feeding Fee"
              required
              className="bg-transparent border-none outline-none w-full text-base text-[var(--color-ds-on-surface)] placeholder:text-[var(--color-ds-outline)]"
            />
          </GlassInputWrapper>
        </label>

        {/* Amount */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] uppercase">
            Amount (GHS)
          </span>
          <GlassInputWrapper
            leadingIcon={<span className="text-sm font-semibold text-[var(--color-ds-outline)]">GHS</span>}
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-transparent border-none outline-none w-full text-base text-[var(--color-ds-on-surface)] placeholder:text-[var(--color-ds-outline)]"
            />
          </GlassInputWrapper>
        </label>

        {/* Frequency */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] uppercase">
            Frequency
          </span>
          <GlassInputWrapper leadingIcon={<Calendar className="w-4 h-4" />}>
            <select
              value={frequency}
              onChange={e => setFreq(e.target.value as FeeFrequency)}
              className="bg-transparent border-none outline-none w-full text-base text-[var(--color-ds-on-surface)] appearance-none cursor-pointer"
            >
              {(['Daily', 'Weekly', 'Termly', 'Once'] as FeeFrequency[]).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </GlassInputWrapper>
        </label>

        {/* Term */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] uppercase">
            Applicable Term
          </span>
          <GlassInputWrapper>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-base text-[var(--color-ds-on-surface)] appearance-none cursor-pointer"
            >
              <option value="all">All Terms</option>
              <option value="term1">Term 1</option>
              <option value="term2">Term 2</option>
              <option value="term3">Term 3</option>
            </select>
          </GlassInputWrapper>
        </label>

        {/* Applies to — checkboxes */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ds-on-surface-variant)] uppercase">
            Applies To (Classes)
          </span>
          <div className="glass-input rounded-xl p-4 max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-3">
            {ALL_CLASSES.map(cls => (
              <label key={cls} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={appliesTo.includes(cls)}
                  onChange={() => toggleClass(cls)}
                  className="w-5 h-5 rounded accent-[var(--color-ds-primary)]"
                />
                <span className="text-sm text-[var(--color-ds-on-surface)] group-hover:text-[var(--color-ds-primary)] transition-colors">
                  {cls}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-2 pt-4 border-t border-[var(--color-ds-outline-variant)]/30">
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full min-h-[60px] bg-[var(--color-ds-primary)] text-white rounded-xl font-semibold text-base',
              'flex items-center justify-center gap-2',
              'hover:bg-[var(--color-ds-surface-tint)] transition-colors',
              'active:scale-[0.98] shadow-lg shadow-[var(--color-ds-primary)]/20',
              loading && 'opacity-60 cursor-not-allowed'
            )}
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving…' : 'Save Fee Type'}
          </button>
        </div>
      </form>
    </div>
  )
}
