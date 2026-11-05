/**
 * weekly-summary-types — domain models for weekly_totals / weekly_class_totals views.
 */

export interface AdminWeeklyTotals {
  weekStart: string
  weekEnd: string
  schoolDaysRecorded: number
  presentTotal: number
  absentTotal: number
  feedingCollected: number
  avgPresentPerDay: number
  avgAbsentPerDay: number
  hasRecords: boolean
}

export interface AdminWeeklyClassTotal {
  classId: string
  className: string
  sortOrder: number
  presentDays: number
  absentDays: number
  feedingCollected: number
}

export interface AdminWeeklySnapshot {
  totals: AdminWeeklyTotals
  classes: AdminWeeklyClassTotal[]
}

export interface AdminWeeklyPdfLine {
  feedingCollected: number
  presentTotal: number
  absentTotal: number
}
