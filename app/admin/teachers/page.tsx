'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

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

  // PIN reset
  const [newPin, setNewPin] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [teachRes, clsRes] = await Promise.all([
      supabase.from('user_profiles').select('id, full_name, class_id, phone, is_active, last_sync_at, classes(name)').eq('role', 'teacher').order('full_name'),
      supabase.from('classes').select('id, name').order('sort_order'),
    ])

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
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPin.trim()) return
    setSaving(true)
    // Create auth user + profile
    const { data: authData } = await supabase.auth.admin?.createUser({
      email: addEmail.trim(),
      password: addPin.trim(),
      email_confirm: true,
    }) ?? { data: null }
    if (authData?.user) {
      await supabase.from('user_profiles').insert({
        id: authData.user.id,
        full_name: addName.trim(),
        role: 'teacher',
        class_id: addClassId || null,
        phone: null,
        is_active: true,
      })
    }
    setShowAdd(false); setAddName(''); setAddEmail(''); setAddClassId(''); setAddPin('')
    await fetchData(); setSaving(false)
  }

  const handleToggleActive = async (teacher: TeacherRow) => {
    await supabase.from('user_profiles').update({ is_active: !teacher.is_active }).eq('id', teacher.id)
    await fetchData()
  }

  if (!isProprietress) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar
        title="Teachers"
        backHref="/admin/dashboard"
        rightAction={
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
            onClick={() => setShowAdd(true)} icon={<Plus className="h-4 w-4" />}>Add</Button>
        }
      />

      <main className="px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No teachers found</div>
          ) : (
            <div className="divide-y divide-gray-50">
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
          {[
            { label: 'Full Name *', value: addName, onChange: setAddName, placeholder: 'Teacher name', type: 'text' },
            { label: 'Email *', value: addEmail, onChange: setAddEmail, placeholder: 'teacher@email.com', type: 'email' },
            { label: 'PIN (4 digits) *', value: addPin, onChange: setAddPin, placeholder: '1234', type: 'password', maxLength: 4 },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{field.label}</label>
              <input type={field.type} value={field.value} onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder} maxLength={(field as { maxLength?: number }).maxLength}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class (optional)</label>
            <select value={addClassId} onChange={e => setAddClassId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-morning-green-500">
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
                setSaving(true)
                await supabase.auth.admin?.updateUserById(pinTarget.id, { password: newPin })
                setPinTarget(null); setNewPin('')
                setSaving(false)
              }}>
              Update PIN
            </Button>
          </div>
        }>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New 4-digit PIN</label>
          <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)}
            placeholder="Enter new 4-digit PIN"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-2xl tracking-widest outline-none focus:border-morning-green-500 text-center font-mono" />
        </div>
      </Modal>
    </div>
  )
}
