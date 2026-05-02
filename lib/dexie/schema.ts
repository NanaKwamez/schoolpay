import Dexie, { type EntityTable } from 'dexie'
import type {
  Student,
  Payment,
  FeedingDailyLog,
  Expense,
  SyncQueueItem,
  Class,
  FeeType,
  Term,
  UserProfile,
} from '@/types'

interface SchoolPayDB extends Dexie {
  students: EntityTable<Student, 'id'>
  classes: EntityTable<Class, 'id'>
  feeTypes: EntityTable<FeeType, 'id'>
  terms: EntityTable<Term, 'id'>
  payments: EntityTable<Payment, 'id'>
  feedingLogs: EntityTable<FeedingDailyLog, 'id'>
  expenses: EntityTable<Expense, 'id'>
  userProfiles: EntityTable<UserProfile, 'id'>
  syncQueue: EntityTable<SyncQueueItem, 'localId'>
}

const db = new Dexie('schoolpay') as SchoolPayDB

db.version(1).stores({
  students: 'id, class_id, full_name, is_active',
  classes: 'id, level, sort_order',
  feeTypes: 'id, fund_type, frequency, is_active',
  terms: 'id, is_current, year',
  payments: 'id, student_id, fee_type_id, term_id, date_paid, synced, local_id',
  feedingLogs: 'id, student_id, date, status, synced, local_id',
  expenses: 'id, fund_id, date_of_expense, approval_status, recorded_by',
  userProfiles: 'id, role, class_id',
  syncQueue: 'localId, tableName, operation, createdAt',
})

export { db }
export type { SchoolPayDB }
