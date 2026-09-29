// ════════════════════════════════════════════════════════════════
//  TEMPLATE: fukin — the seed template (FV/CO engine ported to Next 14)
//  Landing + real ordering + real admin, themed per tenant.
//  Tenant theme + config flow in via <TenantShell cfg={...}>
// ════════════════════════════════════════════════════════════════

import type { TenantConfig } from './registry'

// Per-tenant theme applied at runtime: components read CSS vars
// (--t-bg, --t-panel, --t-line, --t-primary, --t-cream, --t-accent)
// so one template renders any brand.

export function themeVars(t: TenantConfig['theme']): React.CSSProperties {
  return {
    ['--t-bg' as string]: t.bg,
    ['--t-panel' as string]: t.panel,
    ['--t-line' as string]: t.line,
    ['--t-primary' as string]: t.primary,
    ['--t-cream' as string]: t.cream,
    ['--t-accent' as string]: t.accent,
    ['--t-text' as string]: t.text,
    // --fv-* channel triplets for Tailwind fv-* utilities (rgb(var(--fv-x) / <alpha-value>))
    ['--fv-black' as string]: tripletOrHex(t.bg, '10 10 10'),
    ['--fv-panel' as string]: tripletOrHex(t.panel, '19 19 19'),
    ['--fv-line' as string]: tripletOrHex(t.line, '35 35 35'),
    ['--fv-orange' as string]: tripletOrHex(t.primary, '243 106 18'),
    ['--fv-cream' as string]: tripletOrHex(t.cream, '245 242 233'),
    ['--fv-green' as string]: tripletOrHex(t.accent, '133 168 13'),
    ['--fv-red' as string]: '217 45 32',
  }
}

/** Accepts #rrggbb or "r g b"; returns "r g b" for rgb(var()) usage. */
function tripletOrHex(hex: string, fallback: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return fallback
  const h = m[1]
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`
}

export const DEFAULT_FUKIN_THEME: TenantConfig['theme'] = {
  bg: '#0a0a0a',
  panel: '#131313',
  line: '#232323',
  primary: '#f36a12',
  cream: '#f5f2e9',
  accent: '#85a80d',
  text: '#f5f2e9',
}