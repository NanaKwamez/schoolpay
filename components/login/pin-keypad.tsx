'use client'

/** PIN dots + numeric keypad for teacher login on the login page. */

import { Delete } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface PinDotRowProps {
  length: number
  filled: number
}

export function PinDotRow({ length, filled }: PinDotRowProps) {
  return (
    <div className="flex justify-center gap-4 py-4">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 w-4 rounded-full border-2 transition-all duration-150',
            i < filled
              ? 'bg-mga-green-dark border-mga-green-dark'
              : 'bg-white border-gray-300'
          )}
        />
      ))}
    </div>
  )
}

export interface KeypadProps {
  onDigit: (digit: string) => void
  onBackspace: () => void
  disabled?: boolean
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

export function Keypad({ onDigit, onBackspace, disabled }: KeypadProps) {
  const digitBtn =
    'h-16 rounded-xl bg-mga-cream-dark border border-mga-gold/20 text-2xl font-semibold text-gray-900 transition-all duration-100 select-none active:scale-95 active:bg-mga-green-pale focus-visible:ring-2 focus-visible:ring-mga-green-pale focus-visible:ring-offset-0 outline-none disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="space-y-3">
      {KEYPAD_ROWS.map(row => (
        <div key={row.join('')} className="grid grid-cols-3 gap-3">
          {row.map(digit => (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => onDigit(digit)}
              className={digitBtn}
            >
              {digit}
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-3 gap-3">
        <div />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit('0')}
          className={digitBtn}
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="Delete last digit"
          className={cn(
            digitBtn,
            'flex items-center justify-center text-gray-600'
          )}
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
