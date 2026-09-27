import Link from 'next/link'

/**
 * Live-text wordmark — no raster dependency.
 * COOKIES in cream + ORGANIC in green, Fredoka 700.
 * size: 'xs' (tab bars / dense chrome) | 'sm' (app header) | 'md' (desktop nav) | 'lg' (footer)
 * When David's vector logo lands, swap this component's return only.
 */
const SIZES = {
  xs: { mark: 'text-[15px]', tag: 'text-[7px] tracking-[0.18em]' },
  sm: { mark: 'text-[17px]', tag: 'text-[7px] tracking-[0.2em]' },
  md: { mark: 'text-[22px]', tag: 'text-[8px] tracking-[0.24em]' },
  lg: { mark: 'text-[34px]', tag: 'text-[10px] tracking-[0.3em]' },
} as const

export default function FvLogo({
  size = 'sm',
  href,
  stacked = false,
  withTagline = false,
}: {
  size?: keyof typeof SIZES
  href?: string
  stacked?: boolean
  withTagline?: boolean
}) {
  const s = SIZES[size]
  const mark = (
    <span
      className={`font-display font-bold leading-none tracking-tight ${s.mark} inline-flex items-baseline ${
        stacked ? 'flex-col gap-0.5' : 'gap-[0.22em]'
      }`}
    >
      <span>
        <span className="text-fv-cream">COOKIES</span>{' '}
        <span className="text-fv-orange">ORGANIC</span>
      </span>
      {withTagline && (
        <span className={`${s.tag} font-sans font-medium uppercase text-fv-cream/40`}>
          Horneado Orgánico · Santa Cruz
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Cookies Organic — inicio" className="inline-flex items-center">
        {mark}
      </Link>
    )
  }
  return <span className="inline-flex items-center">{mark}</span>
}