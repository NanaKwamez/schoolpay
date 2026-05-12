'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { isValidPin, fieldBorder } from '@/lib/validation'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

async function postJSON(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({}))
      const error = (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
      return { ok: false, error }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

interface TeacherRow {
  id: string
  full_name: string
  class_name: string | null
  class_id: string | null
  phone: string | null
  is_active: boolean
  last_sync_at: string | null
}

interface ClassOption { id: string; name: string }

function syncStatus(lastSync: string | null): { label: string; color: string } {
  if (!lastSync) return { label: 'Never synced', color: 'text-red-600' }
  const h = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60)
  if (h > 48) return { label: `${Math.round(h)}h ago`, color: 'text-red-600' }
  if (h > 24) return { label: `${Math.round(h)}h ago`, color: 'text-orange-600' }
  return { label: `${Math.round(h)}h ago`, color: 'text-gray-500' }
}

export default function AdminTeachersPage() {
  const router = useRouter()
  const { isProprietress, role } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const { showToast } = useToast()

  // Redirect non-proprietress
  useEffect(() => {
    if (role && role !== 'proprietress') router.replace('/admin/dashboard')
  }, [role, router])

  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [pinTarget, setPinTarget] = useState<TeacherRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Add form
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addClassId, setAddClassId] = useState('')
  const [addPin, setAddPin] = useState('')
  const [addErrors, setAddErrors] = useState<{ name?: string; email?: string; pin?: string }>({})

  // PIN reset
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [teachRes, clsRes] = await Promise.all([
      supabase.from('user_profiles').select('id, full_name, class_id, phone, is_active, last_sync_at, classes(name)').eq('role', 'teacher').order('full_name'),
      supabase.from('classes').select('id, name').order('sort_order'),
    ])

    if (teachRes.error) showToast(teachRes.error.message, 'error')
    if (clsRes.error) showToast(clsRes.error.message, 'error')

    setTeachers((teachRes.data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      full_name: t.full_name as string,
      class_id: t.class_id as string | null,
      class_name: (t.classes as { name: string } | null)?.name ?? null,
      phone: t.phone as string | null,
      is_active: t.is_active as boolean,
      last_sync_at: t.last_sync_at as string | null,
    })))

    setClasses(clsRes.data ?? [])
    setLoading(false)
  }, [supabase, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    const errs: typeof addErrors = {}
    if (!addName.trim()) errs.name = 'Full name is required'
    if (!addEmail.trim() || !addEmail.includes('@')) errs.email = 'Valid email is required'
    if (!isValidPin(addPin)) errs.pin = 'PIN must be exactly 4 digits'
    setAddErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const result = await postJSON('/api/admin/teachers', 'POST', {
        fullName: addName.trim(),
        email: addEmail.trim(),
        pin: addPin.trim(),
        classId: addClassId || null,
      })
      if (!result.ok) {
        showToast(result.error, 'error')
        return
      }
      showToast('Teacher added', 'success')
      setShowAdd(false); setAddName(''); setAddEmail(''); setAddClassId(''); setAddPin(''); setAddErrors({})
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (teacher: TeacherRow) => {
    const result = await postJSON(`/api/admin/teachers/${teacher.id}`, 'PATCH', {
      isActive: !teacher.is_active,
    })
    if (!result.ok) {
      showToast(result.error, 'error')
      return
    }
    showToast(teacher.is_active ? 'Teacher deactivated' : 'Teacher activated', 'success')
    await fetchData()
  }

  if (!isProprietress) return null

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Teachers"
        backHref="/admin/dashboard"
        rightAction={
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
            onClick={() => setShowAdd(true)} icon={<Plus className="h-4 w-4" />}>Add</Button>
        }
      />

      <main className="px-4 py-4">
        <div className="mga-card overflow-hidden overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No teachers found</div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {teachers.map(teacher => {
                const sync = syncStatus(teacher.last_sync_at)
                return (
                  <div key={teacher.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('font-semibold text-sm', !teacher.is_active && 'text-gray-400 line-through')}>
                          {teacher.full_name}
                        </p>
                        {!teacher.is_active && <Badge variant="gray">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{teacher.class_name ?? 'No class assigned'}</p>
                      <p className={cn('text-xs mt-0.5 font-medium', sync.color)}>Last sync: {sync.label}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setPinTarget(teacher); setNewPin('') }}
                        className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 min-h-[32px]">
                        Reset PIN
                      </button>
                      <button onClick={() => handleToggleActive(teacher)}
                        className={cn('text-xs font-semibold px-2 py-1 rounded-lg border min-h-[32px] transition',
                          teacher.is_active
                            ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                            : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100')}>
                        {teacher.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add teacher modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Teacher"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleAdd}
              disabled={!addName.trim() || !addEmail.trim() || addPin.length !== 4}>Add</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input type="text" value={addName} onChange={e => { setAddName(e.target.value); setAddErrors(p => ({ ...p, name: undefined })) }}
              placeholder="Teacher name"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.name)}`} />
            {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
            <input type="email" value={addEmail} onChange={e => { setAddEmail(e.target.value); setAddErrors(p => ({ ...p, email: undefined })) }}
              placeholder="teacher@email.com"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.email)}`} />
            {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PIN (4 digits) *</label>
            <input type="password" value={addPin} maxLength={4}
              onChange={e => { setAddPin(e.target.value); setAddErrors(p => ({ ...p, pin: undefined })) }}
              placeholder="1234"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.pin)}`} />
            {addErrors.pin && <p className="text-xs text-red-500 mt-1">{addErrors.pin}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class (optional)</label>
            <select value={addClassId} onChange={e => setAddClassId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid">
              <option value="">No class assigned</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Reset PIN modal */}
      <Modal isOpen={!!pinTarget} onClose={() => setPinTarget(null)} title={`Reset PIN: ${pinTarget?.full_name ?? ''}`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setPinTarget(null)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} disabled={newPin.length !== 4}
              onClick={async () => {
                if (!pinTarget) return
                if (!isValidPin(newPin)) { setPinError('PIN must be exactly 4 digits'); return }
                setSaving(true)
                try {
                  const result = await postJSON(`/api/admin/teachers/${pinTarget.id}`, 'PATCH', { pin: newPin })
                  if (!result.ok) {
                    setPinError(result.error)
                    return
                  }
                  showToast('PIN updated', 'success')
                  setPinTarget(null); setNewPin(''); setPinError('')
                } finally {
                  setSaving(false)
                }
              }}>
              Update PIN
            </Button>
          </div>
        }>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New 4-digit PIN</label>
          <input type="password" maxLength={4} value={newPin}
            onChange={e => { setNewPin(e.target.value); setPinError('') }}
            placeholder="1234"
            className={`w-full border-2 rounded-xl px-4 py-2.5 text-2xl tracking-widest outline-none transition text-center font-mono ${fieldBorder(!!pinError)}`} />
          {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
        </div>
      </Modal>
    </div>
  )
}
