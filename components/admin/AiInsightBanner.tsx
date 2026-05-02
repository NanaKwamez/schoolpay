'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiInsightBannerProps {
  financialData?: {
    totalIncome: number
    totalExpenses: number
    netBalance: number
    debtCount: number
    debtAmount: number
  }
}

export function AiInsightBanner({ financialData }: AiInsightBannerProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchInsight = async () => {
    if (!financialData) return
    setLoading(true)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'insight', data: financialData }),
      })
      const data = await res.json()
      setInsight(data.reply ?? null)
    } catch {
      setInsight(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (financialData) fetchInsight()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!financialData) return null

  return (
    <div className="bg-gradient-to-r from-morning-green-600 to-morning-green-700 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">AI Insight</span>
        </div>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          aria-label="Refresh insight"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-white/30 rounded animate-pulse" />
          <div className="h-3 bg-white/30 rounded animate-pulse w-4/5" />
        </div>
      ) : insight ? (
        <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
      ) : (
        <p className="text-sm text-white/70">Tap refresh to get an AI-powered financial insight.</p>
      )}
    </div>
  )
}
