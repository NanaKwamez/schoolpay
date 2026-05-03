/** Circular Morning Glory Academy logo for headers and branding rows. */

import Image from 'next/image'

import { MGA_LOGO_SRC } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface MgaLogoMarkProps {
  /** Edge length in CSS pixels */
  size?: number
  className?: string
  /** Extra classes on the outer rounded wrapper (e.g. border, ring) */
  wrapperClassName?: string
  priority?: boolean
}

export function MgaLogoMark({
  size = 32,
  wrapperClassName,
  className,
  priority = false,
}: MgaLogoMarkProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-white',
        wrapperClassName
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={MGA_LOGO_SRC}
        alt="Morning Glory Academy logo"
        width={size}
        height={size}
        className={cn('object-cover', className)}
        priority={priority}
      />
    </div>
  )
}
