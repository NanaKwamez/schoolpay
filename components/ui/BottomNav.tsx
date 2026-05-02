'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, BookOpen, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/classes', label: 'Classes', icon: BookOpen },
  { href: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { href: '/admin/fees', label: 'Fees', icon: Settings },
]

const teacherNavItems: NavItem[] = [
  { href: '/teacher/home', label: 'Home', icon: Home },
  { href: '/teacher/feeding', label: 'Feeding', icon: BookOpen },
  { href: '/teacher/payment', label: 'Payment', icon: BarChart2 },
  { href: '/teacher/summary', label: 'Summary', icon: Users },
]

interface BottomNavProps {
  role?: 'admin' | 'teacher'
}

export function BottomNav({ role = 'teacher' }: BottomNavProps) {
  const pathname = usePathname()
  const items = role === 'admin' ? adminNavItems : teacherNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex items-center justify-around px-2 h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
                active ? 'text-morning-green-600' : 'text-gray-400'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-morning-green-600')} />
              <span className={cn('text-xs font-medium', active && 'text-morning-green-600')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
