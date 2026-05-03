'use client'

import { AlertTriangle, TrendingDown, TrendingUp, BarChart2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import type { AiInsightCache } from '@/types'

interface AiInsightBannerProps {
  insightType?: string
  content?: string
  generatedAt?: string
}

function hoursAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / (1000 * 60 * 60))
  if (h < 1) return 'just now'
  return `${h}h ago`
}

function InsightIcon({ type }: { type: string }) {
  if (type === 'anomaly') return <AlertTriangle className="h-5 w-5 text-orange-500" />
  if (type === 'trend') return <TrendingDown className="h-5 w-5 text-blue-500" />
  if (type === 'forecast') return <BarChart2 className="h-5 w-5 text-green-600" />
  return <TrendingUp className="h-5 w-5 text-blue-500" />
}

function borderColor(type: string): string {
  if (type === 'anomaly') return 'border-l-orange-400'
  if (type === 'trend') return 'border-l-blue-400'
  if (type === 'forecast') return 'border-l-green-500'
  return 'border-l-gray-400'
}

function insightHeading(type: string): string {
  if (type === 'anomaly') return 'Anomaly Detected'
  if (type === 'trend') return 'Collection Trend'
  if (type === 'forecast') return 'Term Forecast'
  return 'Insight'
}

// Single card used directly on the dashboard
export function AiInsightBanner({ insightType, content, generatedAt }: AiInsightBannerProps) {
  if (!insightType || !content || !generatedAt) {
    return <Skeleton className="h-24 rounded-2xl" />
  }

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 p-4',
      borderColor(insightType)
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <InsightIcon type={insightType} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800">{insightHeading(insightType)}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{content}</p>
          <p className="text-xs text-gray-400 mt-1.5">Updated {hoursAgo(generatedAt)}</p>
        </div>
      </div>
    </div>
  )
}

// Grid of 3 insight cards from cache data
export function AiInsightsGrid({ insights, loading }: { insights: AiInsightCache[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    )
  }

  if (!insights.length) {
    return (
      <div className="bg-mga-green-pale rounded-2xl border border-dashed border-mga-gold/30 p-4 text-center">
        <p className="text-sm text-gray-400">No AI insights yet. Insights are generated at 6am on school days.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <AiInsightBanner
          key={insight.id}
          insightType={insight.insight_type}
          content={insight.content}
          generatedAt={insight.generated_at}
        />
      ))}
    </div>
  )
}
