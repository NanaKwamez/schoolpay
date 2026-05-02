'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CreditCard,
  AlertCircle,
  BarChart2,
  Users,
  GraduationCap,
  Receipt,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/payments',  icon: CreditCard,      label: 'Payments'  },
  { href: '/admin/debt',      icon: AlertCircle,     label: 'Debts'     },
  { href: '/admin/reports',   icon: BarChart2,       label: 'Reports'   },
  { href: '/admin/students',  icon: Users,           label: 'Students'  },
  { href: '/admin/teachers',  icon: GraduationCap,   label: 'Teachers'  },
  { href: '/admin/fees',      icon: Receipt,         label: 'Fees'      },
]

const bottomItems = [
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
]

/**
 * AdminSideNav — liquid-glass sidebar for the admin portal.
 *
 * Hidden on mobile (use mobile bottom nav instead). Visible on md+.
 * Active route gets a filled background + right accent border.
 */
export function AdminSideNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-50',
        'glass-dark shadow-[10px_0_30px_rgba(0,0,0,0.08)]'
      )}
      aria-label="Admin navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight leading-none">
            SchoolPay
          </h1>
          <p className="text-[11px] text-white/60 mt-0.5 uppercase tracking-wider">
            Admin Portal
          </p>
        </div>
      </div>

      {/* Primary nav links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 no-scrollbar">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl min-h-[52px] font-medium text-sm',
                'transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'bg-white/15 text-white border-r-2 border-white/60 shadow-sm'
                  : 'text-white/65 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon
                className={cn('w-5 h-5 shrink-0', active ? 'opacity-100' : 'opacity-70')}
                strokeWidth={active ? 2.5 : 1.8}
              />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Bottom links */}
      <div className="px-3 pb-6 pt-2 border-t border-white/10 space-y-0.5">
        {bottomItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl min-h-[52px] font-medium text-sm',
                'transition-all duration-200 active:scale-[0.98]',
                active ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white hover:bg-white/8'
              )}
            >
              <Icon className="w-5 h-5 shrink-0 opacity-70" strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-4 py-3 rounded-xl min-h-[52px] font-medium text-sm text-white/65 hover:text-white hover:bg-white/8 transition-all w-full"
          >
            <LogOut className="w-5 h-5 shrink-0 opacity-70" strokeWidth={1.8} />
            Logout
          </button>
        </form>
      </div>
    </nav>
  )
}
