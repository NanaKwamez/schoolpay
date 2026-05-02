'use client'

// Expenses are admin-only and loaded directly from Supabase — not cached in IndexedDB.
// This hook is a placeholder; full implementation will fetch from Supabase in admin pages.
import type { Expense } from '@/types'

export function useExpenses(_fundId?: string): Expense[] {
  return []
}
