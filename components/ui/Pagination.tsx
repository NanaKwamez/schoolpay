'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Total record count text, e.g. "Showing 1 to 10 of 245 records" */
  totalLabel?: string
  className?: string
}

/**
 * Pagination — table pagination component matching the Stitch admin design.
 *
 * Shows prev/next chevrons, first 3 pages, ellipsis, last page.
 * Active page has primary background.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalLabel,
  className,
}: PaginationProps) {
  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-[var(--color-ds-surface-variant)] px-4 py-3',
        className
      )}
    >
      {totalLabel && (
        <span className="text-xs font-medium text-[var(--color-ds-on-surface-variant)]">
          {totalLabel}
        </span>
      )}

      <div className="flex items-center gap-1 ml-auto">
        {/* Prev */}
        <PagButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </PagButton>

        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              className="w-8 text-center text-[var(--color-ds-on-surface-variant)] text-sm select-none"
            >
              …
            </span>
          ) : (
            <PagButton
              key={p}
              onClick={() => onPageChange(p as number)}
              active={p === currentPage}
            >
              {p}
            </PagButton>
          )
        )}

        {/* Next */}
        <PagButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </PagButton>
      </div>
    </div>
  )
}

/* ─── Internal sub-component ─────────────────────────────────────────────── */
function PagButton({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 w-8 rounded flex items-center justify-center text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--color-ds-primary)] text-white'
          : 'border border-[var(--color-ds-surface-variant)] text-[var(--color-ds-on-surface)] hover:bg-[var(--color-ds-surface-container-low)]',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ─── Page number logic ──────────────────────────────────────────────────── */
function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
