// Reusable student avatar — photo or deterministic initials fallback
'use client'

import Image from 'next/image'

interface StudentAvatarProps {
  photoUrl?: string | null
  name: string
  size?: number
}

const AVATAR_BG_COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-400',
] as const

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h
}

export function StudentAvatar({ photoUrl, name, size = 40 }: StudentAvatarProps) {
  if (photoUrl) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={photoUrl}
          alt={name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()

  const colorClass = AVATAR_BG_COLORS[hashName(name) % AVATAR_BG_COLORS.length] ?? 'bg-gray-400'

  return (
    <div
      className={`${colorClass} rounded-full shrink-0 flex items-center justify-center text-white font-bold select-none`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={name}
      role="img"
    >
      {initials}
    </div>
  )
}
