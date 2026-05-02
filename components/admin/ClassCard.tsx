import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CLASS_LEVELS } from '@/lib/constants'
import type { Class, ClassLevel } from '@/types'

interface ClassCardProps {
  cls: Class
  studentCount?: number
}

export function ClassCard({ cls, studentCount = 0 }: ClassCardProps) {
  return (
    <Link href={`/admin/classes/${cls.id}`}>
      <Card className="flex items-center gap-4 hover:shadow-md transition-shadow active:scale-98">
        <div className="h-12 w-12 rounded-xl bg-morning-green-100 flex items-center justify-center shrink-0">
          <Users className="h-6 w-6 text-morning-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="green">{CLASS_LEVELS[cls.level as ClassLevel]}</Badge>
            <span className="text-xs text-gray-500">{studentCount} students</span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
      </Card>
    </Link>
  )
}
