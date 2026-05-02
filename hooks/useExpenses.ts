'use client'

// Expenses are admin-only and loaded directly from Supabase — not cached in IndexedDB.
// This hook is a placeholder; full implementation will fetch from Supabase in admin pages.
import type { Expense } from '@/types'

export function useExpenses(fundId?: string): Expense[] {
  void fundId // admin pages fetch directly from Supabase
  return []
}
