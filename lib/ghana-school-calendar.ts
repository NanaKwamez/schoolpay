/**
 * ghana-school-calendar — weekday YYYY-MM-DD helpers (Accra civil dates via UTC noon).
 */

/** Parse YYYY-MM-DD as a stable instant (midday UTC = same calendar day in Ghana, UTC+0). */
function parseYmdToUtcNoon(ymd: string): Date {
  const parts = ymd.split('-').map(Number)
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

export function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addUtcDays(ymd: string, delta: number): string {
  const d = parseYmdToUtcNoon(ymd)
  d.setUTCDate(d.getUTCDate() + delta)
  return formatUtcYmd(d)
}

/** Monday=0 .. Sunday=6 */
function weekdayMon0Sun6(ymd: string): number {
  const sun0 = parseYmdToUtcNoon(ymd).getUTCDay()
  return sun0 === 0 ? 6 : sun0 - 1
}

/** Monday YYYY-MM-DD of the ISO week containing ymd. */
export function mondayOfIsoWeekContaining(ymd: string): string {
  const mon0 = weekdayMon0Sun6(ymd)
  return addUtcDays(ymd, -mon0)
}

export function mondayToFridayYmds(weekMondayYmd: string): string[] {
  return [0, 1, 2, 3, 4].map(i => addUtcDays(weekMondayYmd, i))
}

export function isWeekdayMonFri(ymd: string): boolean {
  const sun0 = parseYmdToUtcNoon(ymd).getUTCDay()
  return sun0 >= 1 && sun0 <= 5
}

/**
 * Up to `n` weekdays (Mon–Fri), strictly descending from `fromYmd`, not before `termStartYmd`.
 */
export function lastNWeekdaysDescending(
  fromYmd: string,
  termStartYmd: string,
  n: number
): string[] {
  const out: string[] = []
  let cur = fromYmd
  while (out.length < n && cur >= termStartYmd) {
    if (isWeekdayMonFri(cur)) out.push(cur)
    cur = addUtcDays(cur, -1)
  }
  return out
}

/** Oldest → newest (e.g. horizontal day picker). */
export function lastNWeekdaysAscending(fromYmd: string, minYmd: string, n: number): string[] {
  const desc = lastNWeekdaysDescending(fromYmd, minYmd, n)
  return desc.slice().reverse()
}

export function isYmdInInclusiveRange(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end
}
