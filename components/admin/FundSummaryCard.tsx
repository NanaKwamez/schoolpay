import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatGHS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FundSummary } from '@/types'

interface FundSummaryCardProps {
  summary: FundSummary
}

export function FundSummaryCard({ summary }: FundSummaryCardProps) {
  const isPositive = summary.net_balance >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summary.fund_name}</CardTitle>
        <Wallet className="h-5 w-5 text-morning-green-600" />
      </CardHeader>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" /> Income
          </span>
          <span className="font-medium text-green-600">{formatGHS(summary.total_income)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" /> Expenses
          </span>
          <span className="font-medium text-red-600">{formatGHS(summary.total_expenses)}</span>
        </div>
        <div className="border-t border-gray-100 pt-2 flex justify-between">
          <span className="font-semibold text-gray-700">Balance</span>
          <span className={cn('font-bold text-lg', isPositive ? 'text-green-600' : 'text-red-600')}>
            {formatGHS(summary.net_balance)}
          </span>
        </div>
      </div>
    </Card>
  )
}
