import { Card } from '@/components/ui/Card'
import { formatGHS } from '@/lib/utils'
import { Users, DollarSign, AlertTriangle } from 'lucide-react'

interface ClassSummaryCardProps {
  className: string
  totalStudents: number
  presentToday: number
  feedingCollected: number
  outstandingDebt: number
}

export function ClassSummaryCard({
  className,
  totalStudents,
  presentToday,
  feedingCollected,
  outstandingDebt,
}: ClassSummaryCardProps) {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-3">{className}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-mga-green-mid" />
          <div>
            <p className="text-xs text-gray-500">Present</p>
            <p className="font-semibold text-sm">{presentToday}/{totalStudents}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-xs text-gray-500">Feeding</p>
            <p className="font-semibold text-sm text-green-600">{formatGHS(feedingCollected)}</p>
          </div>
        </div>
        {outstandingDebt > 0 && (
          <div className="flex items-center gap-2 col-span-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-gray-500">Outstanding Debt</p>
              <p className="font-semibold text-sm text-orange-600">{formatGHS(outstandingDebt)}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
