/**
 * teacher-fee-collection-helpers — sync payment rows and aggregate collection totals.
 */

import type { ClassFeePayment } from '@/types'

export function sumCollectedGhs(payments: ClassFeePayment[]): number {
  return payments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0)
}

export function countPaidStudents(payments: ClassFeePayment[]): number {
  return payments.filter(p => p.status === 'paid').length
}

export function collectionProgressPct(collected: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, (collected / target) * 100)
}

export function progressBarTone(pct: number): 'red' | 'orange' | 'green' {
  if (pct < 50) return 'red'
  if (pct < 80) return 'orange'
  return 'green'
}
