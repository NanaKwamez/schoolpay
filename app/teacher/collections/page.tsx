'use client'

/**
 * Teacher collections page — class fee drives (class_fee_collections) for current term.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { BottomNav } from '@/components/ui/BottomNav'
import { TopBar } from '@/components/ui/TopBar'
import { TeacherCreateFeeCollectionPanel } from '@/components/teacher/teacher-create-fee-collection-panel'
import { TeacherFeeCollectionCard } from '@/components/teacher/teacher-fee-collection-card'
import { TeacherMarkFeeCollectionModal } from '@/components/teacher/teacher-mark-fee-collection-modal'
import { TeacherMainLoadingBlocks } from '@/components/teacher/teacher-screen-loading-shell'
import { TeacherScreenLoadingShell } from '@/components/teacher/teacher-screen-loading-shell'
import { useAuth } from '@/hooks/useAuth'
import type { ClassFeeCollectionWithPayments } from '@/hooks/use-teacher-fee-collections'
import { useTeacherFeeCollections } from '@/hooks/use-teacher-fee-collections'
import { useTeacherClassName } from '@/hooks/use-teacher-class-name'
import { useTeacherShellReady } from '@/hooks/use-teacher-shell-ready'
import { db } from '@/lib/dexie/schema'
import { cn } from '@/lib/utils'
import type { Student } from '@/types'

export default function TeacherCollectionsPage() {
  const { profile, loading: authLoading } = useAuth()
  const {
    className: teacherClassDisplayName,
    loading: teacherClassNameLoading,
  } = useTeacherClassName()

  const shellReady = useTeacherShellReady(profile, {
    className: teacherClassDisplayName,
    classNameLoading: teacherClassNameLoading,
  })

  const classId = profile?.class_id ?? null
  const teacherUserId = profile?.id ?? null

  const students = useLiveQuery(
    async () => {
      if (!classId) return [] as Student[]
      return db.students.where('class_id').equals(classId).and(s => s.is_active).sortBy('full_name')
    },
    [classId],
    classId ? undefined : ([] as Student[])
  )

  const currentTerm = useLiveQuery(
    async () => {
      const terms = await db.terms.toArray()
      return terms.find(t => t.is_current) ?? null
    },
    [],
    undefined
  )

  const dexieReady =
    currentTerm !== undefined && (classId ? students !== undefined : true)

  const isReady = shellReady && dexieReady && !authLoading

  const termId = currentTerm?.id ?? null

  const { collections, loading: collectionsLoading, refresh } = useTeacherFeeCollections(
    classId,
    termId
  )

  const [modalCollection, setModalCollection] =
    useState<ClassFeeCollectionWithPayments | null>(null)

  const studentList = useMemo(() => students ?? [], [students])
  const studentIds = useMemo(() => studentList.map(s => s.id), [studentList])

  const openModal = useCallback((row: ClassFeeCollectionWithPayments) => {
    setModalCollection(row)
  }, [])

  const handleRefresh = useCallback(async () => {
    await refresh()
  }, [refresh])

  if (!isReady) {
    return (
      <TeacherScreenLoadingShell
        topBarTitle="Collections"
        backHref="/teacher/home"
        showSync
        compactTitles
      />
    )
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-mga-cream pb-24 md:pb-8',
        'dark:bg-[#0A1628]'
      )}
    >
      <TopBar
        title="Class Fee Collections"
        backHref="/teacher/home"
        showSync
        subtitle={teacherClassDisplayName || undefined}
        compactTitles
      />

      <main className="px-4 py-5 space-y-5">
        {!currentTerm ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            There is no active term set. Ask an admin to mark the current term before you
            can manage collections.
          </p>
        ) : (
          <>
            <section aria-label="Active collections">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Active collections
              </h2>
              {collectionsLoading ? (
                <TeacherMainLoadingBlocks />
              ) : collections.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 py-2">
                  No collections yet. Create one below.
                </p>
              ) : (
                <ul className="space-y-4">
                  {collections.map(row => (
                    <li key={row.id}>
                      <TeacherFeeCollectionCard
                        row={row}
                        studentCount={studentList.length}
                        onMarkPayments={() => openModal(row)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Create collection">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                New collection
              </h2>
              <TeacherCreateFeeCollectionPanel
                classId={classId}
                termId={termId}
                teacherUserId={teacherUserId}
                studentIds={studentIds}
                onCreated={handleRefresh}
              />
            </section>
          </>
        )}
      </main>

      <BottomNav />

      <TeacherMarkFeeCollectionModal
        isOpen={modalCollection !== null}
        onClose={() => setModalCollection(null)}
        collection={modalCollection}
        students={studentList}
        onPaymentsChanged={handleRefresh}
      />
    </div>
  )
}
