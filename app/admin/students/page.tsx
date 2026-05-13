'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Camera, Plus, Search, Users } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/ui/TopBar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { StudentAvatar } from '@/components/ui/StudentAvatar'
import { isValidGhanaPhone, fieldBorder } from '@/lib/validation'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { cn, compressImage } from '@/lib/utils'

interface StudentRow {
  id: string
  full_name: string
  class_id: string
  class_name: string
  parent_phone: string | null
  is_active: boolean
  photo_url: string | null
}

interface ClassOption { id: string; name: string; count: number }

export default function AdminStudentsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { showToast } = useToast()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadId = useRef<string | null>(null)

  // Add form
  const [addName, setAddName] = useState('')
  const [addClassId, setAddClassId] = useState('')
  const [addPhone, setAddPhone] = useState('')

  // Move form
  const [moveStudent, setMoveStudent] = useState<StudentRow | null>(null)
  const [moveClassId, setMoveClassId] = useState('')

  // Bulk
  const [bulkText, setBulkText] = useState('')
  const [bulkClassId, setBulkClassId] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [stuRes, clsRes] = await Promise.all([
      supabase.from('students').select('id, full_name, class_id, parent_phone, is_active, photo_url, classes(name)').order('full_name'),
      supabase.from('classes').select('id, name').order('sort_order'),
    ])

    const classMap = new Map<string, string>()
    ;(clsRes.data ?? []).forEach((c: { id: string; name: string }) => classMap.set(c.id, c.name))

    const rows: StudentRow[] = (stuRes.data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      full_name: s.full_name as string,
      class_id: s.class_id as string,
      class_name: (s.classes as { name: string } | null)?.name ?? '—',
      parent_phone: s.parent_phone as string | null,
      is_active: s.is_active as boolean,
      photo_url: s.photo_url as string | null,
    }))

    setStudents(rows)

    const countMap = new Map<string, number>()
    rows.forEach(s => { if (s.is_active) countMap.set(s.class_id, (countMap.get(s.class_id) ?? 0) + 1) })

    setClasses((clsRes.data ?? []).map((c: { id: string; name: string }) => ({
      id: c.id, name: c.name, count: countMap.get(c.id) ?? 0,
    })))

    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let result = students
    if (classFilter) result = result.filter(s => s.class_id === classFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s => s.full_name.toLowerCase().includes(q))
    }
    return result
  }, [students, classFilter, search])

  const [addErrors, setAddErrors] = useState<{ name?: string; class?: string; phone?: string }>({})

  const handleAdd = async () => {
    const errs: typeof addErrors = {}
    if (!addName.trim()) errs.name = 'Student name is required'
    if (!addClassId) errs.class = 'Class is required'
    if (addPhone.trim() && !isValidGhanaPhone(addPhone)) errs.phone = 'Must be a valid Ghana number (0XXXXXXXXX)'
    setAddErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const { error } = await supabase.from('students').insert({
        full_name: addName.trim(),
        class_id: addClassId,
        parent_phone: addPhone.trim() || null,
        is_active: true,
      })
      if (error) {
        showToast(error.message, 'error')
        return
      }
      showToast('Student added', 'success')
      setShowAdd(false); setAddName(''); setAddClassId(''); setAddPhone(''); setAddErrors({})
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleMove = async () => {
    if (!moveStudent || !moveClassId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('students').update({ class_id: moveClassId }).eq('id', moveStudent.id)
      if (error) {
        showToast(error.message, 'error')
        return
      }
      showToast('Student moved', 'success')
      setMoveStudent(null); setMoveClassId('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (student: StudentRow) => {
    const { error } = await supabase.from('students').update({ is_active: !student.is_active }).eq('id', student.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast(student.is_active ? 'Student deactivated' : 'Student activated', 'success')
    await fetchData()
  }

  const handleBulkImport = async () => {
    if (!bulkText.trim() || !bulkClassId) return
    setSaving(true)
    try {
      const names = bulkText.split('\n').map(n => n.trim()).filter(Boolean)
      const { error } = await supabase.from('students').insert(names.map(name => ({
        full_name: name, class_id: bulkClassId, is_active: true, parent_phone: null,
      })))
      if (error) {
        showToast(error.message, 'error')
        return
      }
      showToast(`Imported ${names.length} student${names.length === 1 ? '' : 's'}`, 'success')
      setShowBulk(false); setBulkText(''); setBulkClassId('')
      await fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleCameraClick = (studentId: string) => {
    pendingUploadId.current = studentId
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const studentId = pendingUploadId.current
    if (!file || !studentId) return

    const student = students.find(s => s.id === studentId)
    if (!student) return

    setUploadingId(studentId)
    try {
      const blob = await compressImage(file)
      const path = `${student.class_id}/${studentId}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(path)

      const publicUrl = urlData.publicUrl

      await supabase.from('students').update({ photo_url: publicUrl }).eq('id', studentId)

      setStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, photo_url: publicUrl } : s)
      )
    } catch (err) {
      console.error('Photo upload failed:', err instanceof Error ? err.message : err)
    } finally {
      setUploadingId(null)
      pendingUploadId.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-mga-cream">
      <TopBar
        title="Students"
        backHref="/admin/dashboard"
        rightAction={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => setShowBulk(true)} icon={<Users className="h-4 w-4" />}>Bulk</Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20"
              onClick={() => setShowAdd(true)} icon={<Plus className="h-4 w-4" />}>Add</Button>
          </div>
        }
      />

      {/* Hidden shared file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <main className="px-4 py-4 space-y-4">
        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="search" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-mga-green-mid bg-white" />
          </div>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white min-h-[44px]">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
          </select>
        </div>

        {/* Student list */}
        <div className="mga-card overflow-hidden overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No students found</div>
          ) : (
            <div className="divide-y divide-mga-green-pale/40">
              {filtered.map(student => (
                <div key={student.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar + camera button */}
                  <div className="relative shrink-0">
                    {uploadingId === student.id ? (
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-mga-green-mid border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <StudentAvatar photoUrl={student.photo_url} name={student.full_name} size={40} />
                    )}
                    <button
                      onClick={() => handleCameraClick(student.id)}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-mga-green-mid text-white rounded-full flex items-center justify-center hover:bg-mga-green-dark transition-colors"
                      aria-label={`Upload photo for ${student.full_name}`}
                    >
                      <Camera className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-semibold text-sm', student.is_active ? 'text-gray-900' : 'text-gray-400 line-through')}>
                        {student.full_name}
                      </p>
                      {!student.is_active && <Badge variant="gray">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{student.class_name}{student.parent_phone ? ` · ${student.parent_phone}` : ''}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setMoveStudent(student); setMoveClassId(student.class_id) }}
                      className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 min-h-[32px]">
                      Move
                    </button>
                    <button onClick={() => handleToggleActive(student)}
                      className={cn('text-xs font-semibold px-2 py-1 rounded-lg min-h-[32px] border transition',
                        student.is_active
                          ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100')}>
                      {student.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add student modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Student"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleAdd} disabled={!addName.trim() || !addClassId}>Add</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input value={addName} onChange={e => { setAddName(e.target.value); setAddErrors(p => ({ ...p, name: undefined })) }}
              placeholder="Student's full name"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.name)}`} />
            {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
            <select value={addClassId} onChange={e => { setAddClassId(e.target.value); setAddErrors(p => ({ ...p, class: undefined })) }}
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.class)}`}>
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {addErrors.class && <p className="text-xs text-red-500 mt-1">{addErrors.class}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Phone (optional)</label>
            <input value={addPhone} onChange={e => { setAddPhone(e.target.value); setAddErrors(p => ({ ...p, phone: undefined })) }}
              placeholder="e.g. 0241234567" type="tel"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition ${fieldBorder(!!addErrors.phone)}`} />
            {addErrors.phone && <p className="text-xs text-red-500 mt-1">{addErrors.phone}</p>}
          </div>
        </div>
      </Modal>

      {/* Move class modal */}
      <Modal isOpen={!!moveStudent} onClose={() => setMoveStudent(null)} title={`Move: ${moveStudent?.full_name ?? ''}`}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setMoveStudent(null)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleMove} disabled={!moveClassId || moveClassId === moveStudent?.class_id}>Move</Button>
          </div>
        }>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">New Class</label>
          <select value={moveClassId} onChange={e => setMoveClassId(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* Bulk import modal */}
      <Modal isOpen={showBulk} onClose={() => setShowBulk(false)} title="Bulk Import Students"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button variant="primary" fullWidth loading={saving} onClick={handleBulkImport} disabled={!bulkText.trim() || !bulkClassId}>Import</Button>
          </div>
        }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
            <select value={bulkClassId} onChange={e => setBulkClassId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mga-green-mid">
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Student Names (one per line)</label>
            <textarea rows={8} value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder="Kwame Mensah&#10;Ama Boateng&#10;Kojo Asante&#10;..."
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-mga-green-mid resize-none font-mono" />
            <p className="text-xs text-gray-400 mt-1">
              {bulkText.split('\n').filter(n => n.trim()).length} names detected
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
