import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatGHS } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  isCurrency?: boolean
  className?: string
}

export function ReportCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  isCurrency = false,
  className,
}: ReportCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm text-gray-500 font-medium">{title}</CardTitle>
        <div className={cn(
          'h-9 w-9 rounded-lg flex items-center justify-center',
          trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          )} />
        </div>
      </CardHeader>
      <p className={cn(
        'text-2xl font-bold',
        trend === 'up' ? 'text-green-700' : trend === 'down' ? 'text-red-700' : 'text-gray-900'
      )}>
        {isCurrency ? formatGHS(value as number) : value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </Card>
  )
}
