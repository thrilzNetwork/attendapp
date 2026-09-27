export type HoursConfig = {
  /** La Paz time 'HH:MM' (24h) */
  hoursOpen: string
  hoursClose: string
  /** false = 24h, no gating */
  hoursEnabled: boolean
}

/** Default: every day 18:00–23:00 La Paz. Admin can change all of it in the panel. */
export const DEFAULT_HOURS: HoursConfig = { hoursOpen: '18:00', hoursClose: '23:00', hoursEnabled: true }

/** true if 'HH:MM' (24h, 00:00–23:59) */
export function isValidHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s)
}

/** Is 'HH:MM' inside the open window (handles overnight wrap)? */
export function isHHMMInsideHours(hhmm: string, hours: HoursConfig): boolean {
  const open = hhmmToMinutes(hours.hoursOpen)
  const close = hhmmToMinutes(hours.hoursClose)
  const t = hhmmToMinutes(hhmm)
  if (open === null || close === null || t === null) return false
  if (!hours.hoursEnabled) return true
  if (open <= close) return t >= open && t < close
  return t >= open || t < close
}

/** Minutes since midnight for 'HH:MM', or null when invalid. */
export function hhmmToMinutes(s: string): number | null {
  if (!isValidHHMM(s)) return null
  const [h, m] = s.split(':').map((x) => parseInt(x, 10))
  return h * 60 + m
}

/** Human label: '6:00 PM – 11:00 PM' (12h, matching the brand voice). */
export function formatHoursRange(open: string, close: string): string {
  const fmt = (t: string) => {
    const mins = hhmmToMinutes(t)
    if (mins === null) return t
    const h24 = Math.floor(mins / 60)
    const mm = String(mins % 60).padStart(2, '0')
    const period = h24 < 12 ? 'AM' : 'PM'
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    return `${h12}:${mm} ${period}`
  }
  return `${fmt(open)} – ${fmt(close)}`
}

/**
 * Is the kitchen open right now in La Paz? Overnight windows (close <= open) wrap past midnight.
 * Anything unparseable defaults to OPEN (fail-open: never silently lose an order
 * because of a bad admin edit). `enabled: false` = always open (24h mode).
 */
export function isOpenNowInLaPaz(hours: HoursConfig, now: Date = new Date()): boolean {
  if (!hours || !hours.hoursEnabled) return true
  const open = hhmmToMinutes(hours.hoursOpen)
  const close = hhmmToMinutes(hours.hoursClose)
  if (open === null || close === null) return true
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const nowMins = hhmmToMinutes(parts.replace(/^24:/, '00:'))
  if (nowMins === null) return true
  if (open <= close) return nowMins >= open && nowMins < close
  return nowMins >= open || nowMins < close
}