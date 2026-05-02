import { formatGHS } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { StudentBalance } from '@/types'

interface DebtListProps {
  balances: StudentBalance[]
}

export function DebtList({ balances }: DebtListProps) {
  const debtors = balances.filter(b => b.outstanding_balance > 0)

  if (debtors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No outstanding debts.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {debtors.map(b => (
        <div key={`${b.student_id}-${b.fee_type_id}`} className="flex items-center gap-3 py-3">
          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{b.student_name}</p>
            <p className="text-xs text-gray-500 truncate">{b.class_name} · {b.fee_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-red-600">{formatGHS(b.outstanding_balance)}</p>
            <Badge variant={b.payment_status === 'partial' ? 'orange' : 'red'} className="text-xs">
              {b.payment_status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
