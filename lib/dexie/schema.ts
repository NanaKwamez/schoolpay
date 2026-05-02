// Single Dexie instance for SchoolPay offline storage
import Dexie, { type Table } from 'dexie'
import type {
  Class,
  Student,
  FeeType,
  Term,
  UserProfile,
  LocalFeedingLog,
  LocalPayment,
  StudentFeeAssignment,
  SyncQueueItem,
  WeeklyAdvance,
} from '@/types'

class SchoolPayDB extends Dexie {
  classes!: Table<Class, string>
  students!: Table<Student, string>
  feeTypes!: Table<FeeType, string>
  terms!: Table<Term, string>
  userProfile!: Table<UserProfile, string>
  feedingLog!: Table<LocalFeedingLog, string>
  payments!: Table<LocalPayment, string>
  studentFeeAssignments!: Table<StudentFeeAssignment, string>
  syncQueue!: Table<SyncQueueItem, string>
  weeklyAdvance!: Table<WeeklyAdvance, string>

  constructor() {
    super('schoolpay')
    this.version(1).stores({
      // Reference data pulled from Supabase — id is Supabase UUID PK
      classes: 'id, name, level, sort_order',
      students: 'id, full_name, class_id, is_active',
      feeTypes: 'id, name, fund_type, frequency, is_active',
      terms: 'id, term, year, is_current',
      userProfile: 'id, role, class_id',
      studentFeeAssignments: 'id, student_id, fee_type_id, term_id',
      weeklyAdvance: 'id, student_id, week_covered',

      // Offline-first records — local_id is our client-generated string PK
      feedingLog: 'local_id, id, student_id, date, status, synced',
      payments: 'local_id, id, student_id, fee_type_id, synced',

      // Sync outbox — localId is our client-generated string PK
      syncQueue: 'localId, tableName, synced, attempts, createdAt',
    })
  }
}

export const db = new SchoolPayDB()
export type { SchoolPayDB }
