import { StatCard } from '@/components/ui/StatCard'

interface Stats {
  totalExpected: string
  totalCollected: string
  outstanding: string
}

interface DashboardStatGridProps {
  stats: Stats
}

/**
 * DashboardStatGrid — 3-column stat summary from the Stitch finance dashboard.
 *
 * Renders three StatCards: Expected (tertiary), Collected (primary), Outstanding (error).
 * Collapses to single column on mobile.
 */
export function DashboardStatGrid({ stats }: DashboardStatGridProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
      <StatCard
        label="Total Expected"
        value={stats.totalExpected}
        variant="tertiary"
      />
      <StatCard
        label="Total Collected"
        value={stats.totalCollected}
        variant="primary"
      />
      <StatCard
        label="Outstanding"
        value={stats.outstanding}
        variant="error"
      />
    </section>
  )
}
