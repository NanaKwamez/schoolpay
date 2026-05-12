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
      className="w-full text-left rounded-2xl p-5 hover:opacity-90 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mga-gold shadow-gold-glow"
      style={{
        background: isFeeding
          ? 'linear-gradient(135deg, #0D3B2E 0%, #1A5C40 100%)'
          : 'linear-gradient(135deg, #0A1628 0%, #112240 100%)',
      }}
      aria-label={`View ${fund.fund_name} details`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-white/60 uppercase tracking-wide">
            {isFeeding ? 'Feeding Fund' : 'General Fund'}
          </p>
          <p className="text-sm font-semibold text-white/90 mt-0.5">{fund.fund_name}</p>
        </div>
        <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
          {isFeeding
            ? <span className="text-yellow-400 text-base">🍽</span>
            : <span className="text-mga-accent-blue text-base">🏫</span>}
        </div>
      </div>

      {showFull ? (
        <>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Total Collected</span>
              <span className={cn('font-semibold', isFeeding ? 'text-yellow-300' : 'text-mga-accent-blue')}>
                {formatGHS(fund.total_income)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Total Expenses</span>
              <span className="font-semibold text-red-400">{formatGHS(fund.total_expenses)}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-white">Net Balance</span>
              <span className={cn('font-bold text-lg', isPositive
                ? isFeeding ? 'text-yellow-300' : 'text-mga-accent-blue'
                : 'text-red-400'
              )}>
                {formatGHS(fund.net_balance)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            {isPositive
              ? <TrendingUp className="h-3 w-3 text-yellow-400/70" />
              : <TrendingDown className="h-3 w-3 text-red-400/70" />}
            <span>{isPositive ? 'Positive balance' : 'Deficit — review expenses'}</span>
          </div>
        </>
      ) : (
        // Headmaster + feeding fund: show total only
        <>
          <p className={cn('text-2xl font-bold mb-1', isFeeding ? 'text-yellow-400' : 'text-mga-accent-blue')}>
            {formatGHS(fund.total_income)}
          </p>
          <p className="text-xs text-white/70 mb-2">collected this term</p>
          <div className="flex items-center gap-1 text-xs text-white/60 bg-white/10 rounded-2xl px-2 py-1.5">
            <Info className="h-3 w-3 shrink-0" />
            <span>Contact proprietress for full details</span>
          </div>
        </>
      )}
    </button>
  )
}
