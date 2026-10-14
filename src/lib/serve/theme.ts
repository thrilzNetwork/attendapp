/* Attenda Serve — per-tenant theme resolver.
   Maps a tenant's ServeTheme onto the FV token shape the UI already
   consumes (inline styles), so pages keep their structure and only the
   values swap. null theme = default orange skin (fukin look) untouched. */

import { FV } from './fv-tokens';
import { ServeTheme } from './types';

export type ResolvedTheme = { [K in keyof typeof FV]: string } & { themed: boolean };

/* '#RRGGBB' → 'rgba(r,g,b,a)' for the translucent token variants. */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function resolveTheme(t: ServeTheme | null | undefined): ResolvedTheme {
  if (!t) return { ...FV, themed: false };
  return {
    ...FV,
    black: t.background, // page/hero/footer dark
    panel: t.surface, // cards/panels
    line: rgba(t.text, 0.12), // hairlines from brand text color
    orange: t.primary, // buttons, prices, active
    cream: t.text, // main text on dark
    cream50: rgba(t.text, 0.5),
    cream60: rgba(t.text, 0.6),
    cream70: rgba(t.text, 0.7),
    orange10: rgba(t.primary, 0.1),
    orange40: rgba(t.primary, 0.4),
    imgBg: t.surface, // behind product photos
    themed: true,
  };
}