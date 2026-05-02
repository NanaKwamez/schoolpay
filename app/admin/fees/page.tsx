'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatGHS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FundType, FeeFrequency } from '@/types'

interface FeeRow {
  id: string
  name: string
  amount: number
  fund_type: FundType
  frequency: FeeFrequency
  applies_to_term: string | null
  is_active: boolean
  description: string | null
}

const FREQ_LABELS: Record<FeeFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', termly: 'Termly', once: 'One-time',
}

export default function AdminFeesPage() {
  const supabase = createSupabaseBrowserClient()
  const [fees, setFees] = useState<FeeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editFee, setEditFee] = useState<FeeRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form
  const [formName, setFormName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formFund, setFormFund] = useState<FundType>('general')
  const [formFreq, setFormFreq] = useState<FeeFrequency>('termly')
  const [formTerm, setFormTerm] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const openAdd = () => {
    setEditFee(null); setFormName(''); setFormAmount(''); setFormFund('general')
    setFormFreq('termly'); setFormTerm(''); setFormDesc('')
    setShowForm(true)
  }

  const openEdit = (fee: FeeRow) => {
    setEditFee(fee)
    setFormName(fee.name); setFormAmount(fee.amount.toString()); setFormFund(fee.fund_type)
    setFormFreq(fee.frequency); setFormTerm(fee.applies_to_term ?? ''); setFormDesc(fee.description ?? '')
    setShowForm(true)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('fee_types').select('*').order('name')
    setFees(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!formName.trim() || !formAmount) return
    setSaving(true)
    const payload = {
      name: formName.trim(),
      amount: parseFloat(formAmount),
      fund_type: formFund,
      frequency: formFreq,
      applies_to_term: formTerm || null,
      description: formDesc.trim() || null,
      is_active: true,
    }
    if (editFee) {
      await supabase.from('fee_types').update(payload).eq('id', editFee.id)
    } else {
      await supabase.from('fee_types').insert(payload)
    }
    setShowForm(false)
    await fetchData(); setSaving(false)
  }

  const handleToggle = async (fee: FeeRow) => {
    await supabase.from('fee_types').update({ is_active: !fee.is_active }).eq('id', fee.id)
    await fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Fee Types"
        backHref="/admin/dashboard"
        rightAction={
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
            onClick={openAdd} icon={<Plus className="h-4 w-4" />}>Add</Button>
        }
      />

      <main className="px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : fees.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No fee types yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {fees.map(fee => (
                <div key={fee.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('font-semibold text-sm', !fee.is_active && 'text-gray-400 line-through')}>
                        {fee.name}
                      </p>
                      <Badge variant={fee.fund_type === 'feeding' ? 'orange' : 'blue'}>
                        {fee.fund_type === 'feeding' ? 'Feeding' : 'General'}
                      </Badge>
                      <Badge variant="gray">{FREQ_LABELS[fee.frequency]}</Badge>
                      {!fee.is_active && <Badge variant="gray">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fee.description ?? 'No description'}
                      {fee.applies_to_term && ` · Term ${fee.applies_to_term}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-morning-green-700">{formatGHS(fee.amount)}</p>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => openEdit(fee)}
                        className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 min-h-[28px]">
                        Edit
                      </button>
                      <button onClick={() => handleToggle(fee)}
                        className={cn('text-xs font-semibold px-2 py-1 rounded-lg border min-h-[28px] transition',
                          fee.is_active
                            ? 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
                            : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100')}>
                        {fee.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editFee ? 'Edit Fee Type' : 'Add Fee Type'}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleSave}
              disabled={!formName.trim() || !formAmount}>{editFee ? 'Update' : 'Add'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Fee Name *</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Feeding Fee"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (GHS) *</label>
              <input type="number" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Fund</label>
              <select value={formFund} onChange={e => setFormFund(e.target.value as FundType)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500">
                <option value="feeding">Feeding Fund</option>
                <option value="general">General Fund</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
              <select value={formFreq} onChange={e => setFormFreq(e.target.value as FeeFrequency)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500">
                {(Object.entries(FREQ_LABELS) as [FeeFrequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Term (optional)</label>
              <input value={formTerm} onChange={e => setFormTerm(e.target.value)} placeholder="1, 2, or 3"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description (optional)</label>
            <textarea rows={2} value={formDesc} onChange={e => setFormDesc(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
