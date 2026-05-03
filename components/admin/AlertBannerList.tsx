import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertSeverity = 'warning' | 'info' | 'error'

export interface AlertItem {
  id: string
  severity: AlertSeverity
  title: string
  description?: string
}

interface AlertBannerListProps {
  alerts: AlertItem[]
  className?: string
}

const severityStyles: Record<AlertSeverity, string> = {
  warning: 'bg-[var(--color-ds-secondary-fixed)] text-[var(--color-ds-on-secondary-fixed)] border-[var(--color-ds-secondary-fixed-dim)]/40',
  info:    'bg-[var(--color-ds-tertiary-fixed)]  text-[var(--color-ds-on-tertiary-fixed)]  border-[var(--color-ds-tertiary-fixed-dim)]/40',
  error:   'bg-[var(--color-ds-error-container)] text-[var(--color-ds-on-error-container)] border-[var(--color-ds-error)]/20',
}

const SeverityIcon = ({ severity }: { severity: AlertSeverity }) => {
  if (severity === 'info') return <Info className="w-5 h-5 shrink-0" />
  return <AlertTriangle className="w-5 h-5 shrink-0" />
}

/**
 * AlertBannerList — dashboard alert section from the Stitch design.
 *
 * Renders a vertical stack of alert banners (warning/info/error).
 * Matches the orange/blue glass alert cards in the finance dashboard design.
 */
export function AlertBannerList({ alerts, className }: AlertBannerListProps) {
  if (alerts.length === 0) return null

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 className="text-xl font-semibold text-[var(--color-ds-on-background)]">
        Alerts
      </h2>
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={cn(
            'flex items-start gap-4 rounded-2xl p-4 min-h-[60px] shadow-sm border',
            severityStyles[alert.severity]
          )}
        >
          <SeverityIcon severity={alert.severity} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{alert.title}</p>
            {alert.description && (
              <p className="text-xs opacity-80 mt-1">{alert.description}</p>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
