'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/dexie/schema'
import type { Expense } from '@/types'

export function useExpenses(fundId?: string): Expense[] {
  return useLiveQuery(
    () =>
      fundId
        ? db.expenses.where('fund_id').equals(fundId).toArray()
        : db.expenses.toArray(),
    [fundId],
    []
  ) as Expense[]
}
