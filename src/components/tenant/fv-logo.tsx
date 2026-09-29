import Link from 'next/link'

/**
 * Live-text wordmark — verbatim fukin-template component.
 * Wordmark halves come from props (cfg.brand via the landing); no hardcoded restaurant names.
 * size: 'xs' (tab bars / dense chrome) | 'sm' (app header) | 'md' (desktop nav) | 'lg' (footer)
 */
const SIZES = {
  xs: { mark: 'text-[15px]', tag: 'text-[7px] tracking-[0.18em]' },
  sm: { mark: 'text-[17px]', tag: 'text-[7px] tracking-[0.2em]' },
  md: { mark: 'text-[22px]', tag: 'text-[8px] tracking-[0.24em]' },
  lg: { mark: 'text-[34px]', tag: 'text-[10px] tracking-[0.3em]' },
} as const

export type LogoWords = { wordA: string; wordB: string; tagline?: string }

export default function FvLogo({
  size = 'sm',
  href,
  stacked = false,
  withTagline = false,
  words,
}: {
  size?: keyof typeof SIZES
  href?: string
  stacked?: boolean
  withTagline?: boolean
  words?: LogoWords
}) {
  const s = SIZES[size]
  const a = words?.wordA ?? 'COOKIES'
  const b = words?.wordB ?? 'ORGANIC'
  const mark = (
    <span
      className={`${s.mark} font-display font-bold leading-none tracking-tight`}
      style={{ fontStretch: 'normal' }}
    >
      <span className="text-fv-cream">{a}</span>{' '}
      <span className="text-fv-orange">{b}</span>
    </span>
  )
  const tag = (
    <span className={`${s.tag} text-fv-cream/50 uppercase`}>
      {words?.tagline ?? 'Horneado Orgánico · Santa Cruz'}
    </span>
  )

  return (
    <Link
      href={href || '/'}
      aria-label={`${a} ${b} — inicio`}
      className="inline-flex items-center"
    >
      {stacked ? (
        <span className="inline-flex flex-col items-center gap-1">
          {mark}
          {tag}
        </span>
      ) : withTagline ? (
        <span className="inline-flex items-center gap-3">
          {mark}
          <span className="h-6 w-px bg-fv-line" aria-hidden="true" />
          {tag}
        </span>
      ) : (
        mark
      )}
    </Link>
  )
}
