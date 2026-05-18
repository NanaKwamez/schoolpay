/**
 * merge-ledger-transactions — combines feeding, fee payments, and manual income for accountant ledger UI.
 */

import type { IncomeEntry, IncomeEntryCategory } from '@/types'

export type LedgerTxnKind = 'feeding' | 'payment' | 'income'

export type MergedLedgerRow = {
  id: string
  kind: LedgerTxnKind
  /** YYYY-MM-DD */
  date: string
  typeLabel: string
  sourceLabel: string
  amount: number
  recordedByLabel: string
}

function incomeCategoryLabel(c: IncomeEntryCategory): string {
  const map: Record<IncomeEntryCategory, string> = {
    offering: 'Offering',
    admission_fee: 'Admission fee',
    mock_fee: 'Mock fee',
    pta_levy: 'PTA levy',
    donation: 'Donation',
    other: 'Other',
  }
  return map[c]
}

export type LedgerFeedingRow = {
  id: string
  date: string
  amount: number
  status: string
  marked_by: string
  students: {
    full_name: string
    classes: { name: string } | null
  } | null
}

export type LedgerPaymentRow = {
  id: string
  date_paid: string
  amount_paid: number
  marked_by: string
  fee_types: { name: string; fund_type: string } | { name: string; fund_type: string }[] | null
  students: {
    full_name: string
    classes: { name: string } | null
  } | null
}

function singleOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] ?? null) : x
}

export function normalizeLedgerFeedingRows(raw: unknown): LedgerFeedingRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item): LedgerFeedingRow => {
    const r = item as Record<string, unknown>
    const stRaw = singleOrNull(r.students as object | object[] | null)
    let students: LedgerFeedingRow['students'] = null
    if (stRaw && typeof stRaw === 'object' && 'full_name' in stRaw) {
      const st = stRaw as { full_name: unknown; classes: unknown }
      const cl = singleOrNull(st.classes as object | object[] | null)
      students = {
        full_name: String(st.full_name ?? ''),
        classes:
          cl && typeof cl === 'object' && 'name' in cl
            ? { name: String((cl as { name: unknown }).name ?? '') }
            : null,
      }
    }
    return {
      id: String(r.id ?? ''),
      date: String(r.date ?? ''),
      amount: Number(r.amount) || 0,
      status: String(r.status ?? ''),
      marked_by: String(r.marked_by ?? ''),
      students,
    }
  })
}

export function normalizeLedgerPaymentRows(raw: unknown): LedgerPaymentRow[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item): LedgerPaymentRow => {
    const r = item as Record<string, unknown>
    const stRaw = singleOrNull(r.students as object | object[] | null)
    let students: LedgerPaymentRow['students'] = null
    if (stRaw && typeof stRaw === 'object' && 'full_name' in stRaw) {
      const st = stRaw as { full_name: unknown; classes: unknown }
      const cl = singleOrNull(st.classes as object | object[] | null)
      students = {
        full_name: String(st.full_name ?? ''),
        classes:
          cl && typeof cl === 'object' && 'name' in cl
            ? { name: String((cl as { name: unknown }).name ?? '') }
            : null,
      }
    }
    const ftRaw = r.fee_types
    let fee_types: LedgerPaymentRow['fee_types'] = null
    if (ftRaw !== null && ftRaw !== undefined) {
      if (Array.isArray(ftRaw)) {
        const first = ftRaw[0]
        fee_types =
          first && typeof first === 'object' && 'fund_type' in first
            ? (first as { name: string; fund_type: string })
            : null
      } else if (typeof ftRaw === 'object' && 'fund_type' in ftRaw) {
        fee_types = ftRaw as { name: string; fund_type: string }
      }
    }

    return {
      id: String(r.id ?? ''),
      date_paid: String(r.date_paid ?? ''),
      amount_paid: Number(r.amount_paid) || 0,
      marked_by: String(r.marked_by ?? ''),
      fee_types,
      students,
    }
  })
}

export function mergeLedgerTransactions(params: {
  feedingRows: LedgerFeedingRow[]
  paymentRows: LedgerPaymentRow[]
  incomeRows: IncomeEntry[]
  /** `userId` → display name */
  namesByUserId: Map<string, string>
}): MergedLedgerRow[] {
  const { feedingRows, paymentRows, incomeRows, namesByUserId } = params
  const out: MergedLedgerRow[] = []

  const byId = (uid: string): string => namesByUserId.get(uid) ?? 'Staff'

  for (const row of feedingRows) {
    const st = row.students
    const className = st?.classes?.name ?? '—'
    out.push({
      id: `f-${row.id}`,
      kind: 'feeding',
      date: row.date.slice(0, 10),
      typeLabel: `Feeding (${row.status})`,
      sourceLabel: st ? `${st.full_name} · ${className}` : className,
      amount: Number(row.amount) || 0,
      recordedByLabel: byId(row.marked_by),
    })
  }

  for (const row of paymentRows) {
    const ft = row.fee_types
    const feeName = Array.isArray(ft) ? ft[0]?.name : ft?.name
    const st = row.students
    const className = st?.classes?.name ?? '—'
    out.push({
      id: `p-${row.id}`,
      kind: 'payment',
      date: row.date_paid.slice(0, 10),
      typeLabel: feeName ? `Fee: ${feeName}` : 'Fee payment',
      sourceLabel: st ? `${st.full_name} · ${className}` : className,
      amount: Number(row.amount_paid) || 0,
      recordedByLabel: byId(row.marked_by),
    })
  }

  for (const row of incomeRows) {
    out.push({
      id: `i-${row.id}`,
      kind: 'income',
      date: row.date_collected.slice(0, 10),
      typeLabel: `Income · ${incomeCategoryLabel(row.category)}`,
      sourceLabel: row.name,
      amount: Number(row.amount) || 0,
      recordedByLabel: byId(row.recorded_by),
    })
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.id < b.id ? 1 : -1
  })

  return out.slice(0, 30)
}
