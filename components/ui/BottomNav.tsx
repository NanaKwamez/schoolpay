'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { Home, Utensils, CreditCard, BarChart2, Wallet, LineChart } from 'lucide-react'

import { useTeacherIncomeNavVisible } from '@/hooks/use-teacher-income-nav-visible'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const teacherNavHomeFeeding: NavItem[] = [
  { href: '/teacher/home', label: 'Home', icon: Home },
  { href: '/teacher/feeding', label: 'Mark Feeding', icon: Utensils },
]

const teacherNavIncome: NavItem = {
  href: '/teacher/feeding-summary',
  label: 'Income',
  icon: LineChart,
}

const teacherNavRest: NavItem[] = [
  { href: '/teacher/collections', label: 'Collections', icon: Wallet },
  { href: '/teacher/payment', label: 'Record Payment', icon: CreditCard },
  { href: '/teacher/summary', label: 'Class Summary', icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  const showIncome = useTeacherIncomeNavVisible()

  const teacherNavItems = useMemo((): NavItem[] => {
    if (showIncome) {
      return [...teacherNavHomeFeeding, teacherNavIncome, ...teacherNavRest]
    }
    return [...teacherNavHomeFeeding, ...teacherNavRest]
  }, [showIncome])

  return (
    <nav
      aria-label="Teacher navigation"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-mga-cream-dark/95 border-t border-mga-gold/20 backdrop-blur-sm safe-bottom"
    >
      <div className="flex items-stretch h-16">
        {teacherNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[48px]',
                'transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-mga-gold/50 focus-visible:ring-inset',
                active ? 'text-mga-green-mid' : 'text-gray-500 hover:text-mga-green-dark',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-100',
                  active && 'text-mga-green-mid scale-110'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-semibold leading-tight',
                  active ? 'text-mga-green-mid' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
