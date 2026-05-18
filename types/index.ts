export type UserRole = 'proprietress' | 'headmaster' | 'teacher' | 'accountant'
export type EnrollmentRequestType = 'enroll' | 'withdraw'
export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected'
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

export type ClassFeeCollectionFundScope = 'class' | 'school'
export type ClassFeePaymentStatus = 'paid' | 'unpaid'

/** Teacher-managed class fee drive (`class_fee_collections`). */
export interface ClassFeeCollection {
  id: string
  class_id: string
  term_id: string
  name: string
  amount_per_student: number
  description: string | null
  fund_scope: ClassFeeCollectionFundScope
  is_one_time: boolean
  created_by: string
  created_at: string
}

/** Per-student row for a collection (`class_fee_payments`). */
export interface ClassFeePayment {
  id: string
  collection_id: string
  student_id: string
  status: ClassFeePaymentStatus
  amount_paid: number
  updated_at: string
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
  photo_url?: string | null
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
  is_waived: boolean
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
  /** Same semantics as `funds.details_access` — surfaced on the summary view */
  details_access: string
  payment_income: number
  other_income: number
  total_income: number
  total_expenses: number
  net_balance: number
}

export type IncomeEntryCategory =
  | 'offering'
  | 'admission_fee'
  | 'mock_fee'
  | 'pta_levy'
  | 'donation'
  | 'other'

export type IncomeEntryDestination = 'school_general' | 'class'

/** `income_entries` table — accountant-inserted supplementary income. */
export interface IncomeEntry {
  id: string
  income_name: string
  amount: number
  date_collected: string
  destination: IncomeEntryDestination
  class_id: string | null
  notes: string | null
  category: IncomeEntryCategory
  recorded_by: string
  created_at: string
  fund_scope?: 'school' | 'class'
  entry_type?: string
  term_id?: string | null
  description?: string | null
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

/** Rolling days from `daily_financial_log` view (Ghana calendar dates). */
export interface DailyFinancialLogRow {
  log_date: string
  feeding_collected: number
  feeding_mark_count: number
}

export interface ClassDailySubmission {
  id: string
  class_id: string
  date: string
  submitted_at: string
  submitted_by: string
}

export interface ClassWithStats extends Class {
  teacher_name: string
  total_students: number
  marked_count: number
  paid_count: number
  credit_count: number
  covered_weekly_count: number
  absent_count: number
  collected_today: number
  submitted_at: string | null
  last_updated?: string
}

/** Single-row `school_attendance_today` view — snake_case matches DB columns. */
export interface SchoolAttendanceTodayRow {
  total_present: number
  total_absent: number
  attendance_percentage: number
  total_unmarked: number
  total_collected: number
  total_expected: number
  total_outstanding: number
}

/** Single-row `term_cumulative_summary` view — snake_case matches DB columns. */
export interface TermCumulativeSummaryRow {
  term_start: string
  grand_total_collected: number
  total_feeding_collected: number
  total_general_collected: number
  total_expenses: number
  net_balance: number
  school_days_recorded: number
}

export interface AiInsightCache {
  id: string
  insight_type: 'anomaly' | 'trend' | 'forecast'
  content: string
  generated_at: string
  valid_until: string
}

export interface EnrollmentRequest {
  id: string
  type: EnrollmentRequestType
  status: EnrollmentRequestStatus
  student_class_id: string
  /** Populated for 'withdraw' requests */
  student_id: string | null
  /** Populated for 'enroll' requests */
  student_name: string | null
  parent_phone: string | null
  requested_by: string
  reviewed_by: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
  /** Joined fields — not in DB columns, populated by query */
  class_name?: string
  requester_name?: string
  existing_student_name?: string
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
