'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, LogOut } from 'lucide-react'

import { MgaLogoMark } from '@/components/branding/mga-logo-mark'
import { Modal } from './Modal'
import { SyncIndicator } from './SyncIndicator'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { useOnlineStatus } from '@/hooks/useOnline'
import { SCHOOL_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  subtitle?: string
  /** href for the back arrow link; omit to hide the back button */
  backHref?: string
  /** Element rendered on the right side (alongside sync indicator) */
  rightAction?: ReactNode
  /** Show the sync status indicator in the top right */
  showSync?: boolean
  /** When false, omit school logo + name (use in-page branding instead). Default true. */
  showSchoolBrand?: boolean
}

export function TopBar({
  title,
  subtitle,
  backHref,
  rightAction,
  showSync = false,
  showSchoolBrand = true,
}: TopBarProps) {
  const { pendingCount, isSyncing } = useSync()
  const { isOnline } = useOnlineStatus()
  const { signOut, isSigningOut } = useAuth()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const handleSignOut = (): void => {
    signOut()
  }

  return (
    <>
      <header className="mga-header sticky top-0 z-30 text-white safe-top shadow-md">
        <div className="flex items-center justify-between px-3 min-h-[64px]">

          {/* Left: back + optional brand + title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Go back"
                className={[
                  'flex items-center justify-center h-12 w-12 rounded-xl shrink-0',
                  'hover:bg-white/20 active:bg-white/30 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                ].join(' ')}
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </Link>
            )}
            {showSchoolBrand && (
              <MgaLogoMark
                size={32}
                wrapperClassName="ring-2 ring-white/45 shadow-sm"
              />
            )}
            <div className="min-w-0 py-2">
              {showSchoolBrand && (
                <p className="text-[11px] font-semibold text-white/85 leading-tight truncate max-w-[14rem]">
                  {SCHOOL_NAME}
                </p>
              )}
              <h1
                className={cn(
                  'font-bold text-white truncate leading-tight',
                  showSchoolBrand ? 'text-base sm:text-lg mt-0.5' : 'text-lg'
                )}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-white/75 truncate leading-tight mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {showSync && (
              <SyncIndicator
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingCount={pendingCount}
                inverted
              />
            )}
            {rightAction}
            <ThemeToggle inverted />
            <button
              onClick={() => setShowSignOutConfirm(true)}
              aria-label="Sign out"
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-xl shrink-0',
                'hover:bg-white/20 active:bg-white/30 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              )}
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <Modal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        title="Sign out"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={cn(
                'flex-1 min-h-[48px] rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors',
                'flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed'
              )}
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  Signing out...
                </>
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">Sign out of SchoolPay?</p>
      </Modal>
    </>
  )
}
