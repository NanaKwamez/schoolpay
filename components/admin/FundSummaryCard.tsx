'use client'

import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'
import { cn, formatGHS } from '@/lib/utils'
import type { FundSummary } from '@/types'

interface FundSummaryCardProps {
  fund: FundSummary
  isProprietress: boolean
  isFeeding: boolean
}

export function FundSummaryCard({ fund, isProprietress, isFeeding }: FundSummaryCardProps) {
  const router = useRouter()
  const showFull = isProprietress || !isFeeding
  const isPositive = fund.net_balance >= 0

  return (
    <button
      onClick={() => router.push('/admin/funds')}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-green-light"
      aria-label={`View ${fund.fund_name} details`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            {isFeeding ? 'Feeding Fund' : 'General Fund'}
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-0.5">{fund.fund_name}</p>
        </div>
        <div className={cn(
          'h-8 w-8 rounded-xl flex items-center justify-center',
          isFeeding ? 'bg-orange-100' : 'bg-blue-100'
        )}>
          {isFeeding
            ? <span className="text-orange-600 text-base">🍽</span>
            : <span className="text-blue-600 text-base">🏫</span>}
        </div>
      </div>

      {showFull ? (
        <>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Collected</span>
              <span className="font-semibold text-green-700">{formatGHS(fund.total_income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Expenses</span>
              <span className="font-semibold text-red-600">{formatGHS(fund.total_expenses)}</span>
            </div>
            <div className="h-px bg-gray-100 my-1" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-700">Net Balance</span>
              <span className={cn('font-bold text-lg', isPositive ? 'text-green-600' : 'text-red-600')}>
                {formatGHS(fund.net_balance)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {isPositive
              ? <TrendingUp className="h-3 w-3 text-green-500" />
              : <TrendingDown className="h-3 w-3 text-red-500" />}
            <span>{isPositive ? 'Positive balance' : 'Deficit — review expenses'}</span>
          </div>
        </>
      ) : (
        // Headmaster + feeding fund: show total only
        <>
          <p className="text-2xl font-bold text-mga-green-mid mb-1">
            {formatGHS(fund.total_income)}
          </p>
          <p className="text-xs text-gray-500 mb-2">collected this term</p>
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-mga-green-pale rounded-lg px-2 py-1.5">
            <Info className="h-3 w-3 shrink-0" />
            <span>Contact proprietress for full details</span>
          </div>
        </>
      )}
    </button>
  )
}
