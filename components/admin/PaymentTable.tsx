'use client'

import { formatGHS, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { Payment } from '@/types'

interface PaymentTableProps {
  payments: Payment[]
  studentNames?: Record<string, string>
}

export function PaymentTable({ payments, studentNames = {} }: PaymentTableProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No payments recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 text-left font-medium text-gray-500">Student</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Amount</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mga-green-pale/40">
          {payments.map(payment => (
            <tr key={payment.id} className="hover:bg-mga-green-pale/50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {studentNames[payment.student_id] ?? payment.student_id.slice(0, 8)}
              </td>
              <td className="px-4 py-3 text-gray-700">{formatGHS(payment.amount_paid)}</td>
              <td className="px-4 py-3">
                <Badge variant={payment.payment_type === 'full' ? 'green' : 'orange'}>
                  {payment.payment_type.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-500">{formatDate(payment.date_paid)}</td>
              <td className="px-4 py-3">
                <Badge variant={payment.synced ? 'green' : 'yellow'}>
                  {payment.synced ? 'Synced' : 'Pending'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
