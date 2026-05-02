import { TopBar } from '@/components/ui/TopBar'
import { BottomNav } from '@/components/ui/BottomNav'
import { AiInsightBanner } from '@/components/admin/AiInsightBanner'
import { Card } from '@/components/ui/Card'
import { DollarSign, Users, AlertTriangle, TrendingUp } from 'lucide-react'
import { SCHOOL_NAME } from '@/lib/constants'

export const metadata = { title: `Dashboard — ${SCHOOL_NAME}` }

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <TopBar title="Dashboard" />
      <main className="px-4 py-4 space-y-4">
        <AiInsightBanner />
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Total Income</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">GHS —</p>
          </Card>
          <Card className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">GHS —</p>
          </Card>
          <Card className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Students</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">—</p>
          </Card>
          <Card className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500">In Debt</p>
            <p className="text-xl font-bold text-orange-600 mt-0.5">—</p>
          </Card>
        </div>
      </main>
    </div>
  )
}
