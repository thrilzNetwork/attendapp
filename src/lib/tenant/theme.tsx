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
  }
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