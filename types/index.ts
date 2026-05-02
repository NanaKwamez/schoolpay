export type UserRole = 'proprietress' | 'headmaster' | 'teacher'
export type ClassLevel = 'nursery' | 'kg' | 'primary' | 'jhs'
export type FeeFrequency = 'daily' | 'weekly' | 'termly' | 'once'
export type PaymentType = 'full' | 'credit' | 'weekly_advance' | 'daily'
export type FeedingStatus = 'paid' | 'credit' | 'absent' | 'did_not_eat' | 'covered_weekly'
export type FundType = 'feeding' | 'general'
export type ApprovalStatus = 'auto_approved' | 'pending' | 'approved' | 'rejected'
export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SchoolSettings {
  id: string
  school_name: string
  school_address: string | null
  school_phone: string | null
  currency_symbol: string
  headmaster_expense_limit: number
  headmaster_sees_feeding_total: boolean
  created_at: string
  updated_at: string
}

export interface Term {
  id: string
  term: '1' | '2' | '3'
  year: number
  start_date: string
  end_date: string
  is_current: boolean
}

export interface Class {
  id: string
  name: string
  level: ClassLevel
  sort_order: number
}

export interface UserProfile {
  id: string
  full_name: string
  role: UserRole
  class_id: string | null
  phone: string | null
  is_active: boolean
  last_sync_at: string | null
}

export interface Student {
  id: string
  full_name: string
  class_id: string
  parent_phone: string | null
  is_active: boolean
}

export interface FeeType {
  id: string
  name: string
  amount: number
  fund_type: FundType
  frequency: FeeFrequency
  applies_to_term: string | null
  is_active: boolean
  description: string | null
}

export interface StudentFeeAssignment {
  id: string
  student_id: string
  fee_type_id: string
  term_id: string
  is_active: boolean
}

export interface WeeklyAdvance {
  id: string
  student_id: string
  fee_type_id: string
  term_id: string
  week_covered: string // ISO date of Monday for that week
  amount_paid: number
  payment_id: string // references the payments record
}

// ─── Local-first records (created offline, synced later) ─────────────────────

/**
 * Local feeding log — lives in IndexedDB, identified by local_id before sync.
 * `id` is the Supabase UUID; empty string '' until successfully synced.
 */
export interface LocalFeedingLog {
  local_id: string // local PK (generated client-side)
  id: string // Supabase UUID, '' until synced
  student_id: string
  date: string // YYYY-MM-DD
  status: FeedingStatus
  amount: number
  marked_by: string
  synced: boolean
}

/**
 * Local payment — lives in IndexedDB, identified by local_id before sync.
 * `id` is the Supabase UUID; empty string '' until successfully synced.
 */
export interface LocalPayment {
  local_id: string // local PK (generated client-side)
  id: string // Supabase UUID, '' until synced
  student_id: string
  fee_type_id: string
  term_id: string
  amount_paid: number
  payment_type: PaymentType
  week_covered: string | null
  date_paid: string
  marked_by: string
  receipt_number: string | null
  notes: string | null
  synced: boolean
}

// ─── Legacy types kept for compatibility ──────────────────────────────────────

/** @deprecated Use LocalFeedingLog for offline use */
export interface FeedingDailyLog {
  id: string
  student_id: string
  date: string
  status: FeedingStatus
  amount: number
  marked_by: string
  synced: boolean
  local_id: string | null
}

/** @deprecated Use LocalPayment for offline use */
export interface Payment {
  id: string
  student_id: string
  fee_type_id: string
  term_id: string
  amount_paid: number
  payment_type: PaymentType
  week_covered: string | null
  date_paid: string
  marked_by: string
  receipt_number: string | null
  notes: string | null
  synced: boolean
  local_id: string | null
}

export interface Expense {
  id: string
  fund_id: string
  category: string
  description: string
  amount: number
  date_of_expense: string
  receipt_reference: string | null
  recorded_by: string
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  notes: string | null
}

export interface Fund {
  id: string
  name: string
  fund_type: FundType
  description: string | null
  details_access: string
}

export interface StudentBalance {
  student_id: string
  student_name: string
  class_name: string
  class_id: string
  term_id: string
  fee_type_id: string
  fee_name: string
  fund_type: FundType
  amount_due: number
  amount_paid: number
  outstanding_balance: number
  payment_status: 'paid' | 'partial' | 'unpaid' | 'waived'
}

export interface FundSummary {
  fund_id: string
  fund_name: string
  fund_type: FundType
  payment_income: number
  other_income: number
  total_income: number
  total_expenses: number
  net_balance: number
}

export interface SyncQueueItem {
  localId: string // PK — generated string UUID
  tableName: string // Supabase table name to sync to
  operation: SyncOperation
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  synced: boolean
}
