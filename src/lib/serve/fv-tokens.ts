/* Attenda Serve — tenant demo design tokens.
   Dark #0a0a0a, panel #131313, line #232323, orange #f36a12,
   cream text #f5f2e9, green #85a80d. Fredoka display everywhere. */

export const FV = {
  black: '#0a0a0a',
  panel: '#131313',
  line: '#232323',
  orange: '#f36a12',
  cream: '#f5f2e9',
  green: '#85a80d',
  red: '#d92d20',
  yape: '#7d3ff2',
  yapeBg: 'rgba(125,63,242,0.10)',
  yapeBorder: 'rgba(125,63,242,0.5)',
  cream50: 'rgba(245,242,233,0.5)',
  cream60: 'rgba(245,242,233,0.6)',
  cream70: 'rgba(245,242,233,0.7)',
  orange10: 'rgba(243,106,18,0.10)',
  orange40: 'rgba(243,106,18,0.40)',
  green10: 'rgba(133,168,13,0.10)',
  green40: 'rgba(133,168,13,0.40)',
  imgBg: '#101010',
} as const;

export function formatPEN(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

export function fmtHours(t: string): string {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) return t;
  const h24 = parseInt(m[1], 10);
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m[2]} ${period}`;
}

/* Placeholder product image: inline SVG dataURL with the tenant's initials —
   used when the wizard didn't upload a photo for the item. */
export function productImage(seed: string, label: string): string {
  const initials = (label || seed).slice(0, 2).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='#101010'/><rect x='16' y='16' width='368' height='368' rx='24' fill='none' stroke='#232323' stroke-width='2' stroke-dasharray='8 8'/><text x='200' y='215' font-family='Arial Black,sans-serif' font-size='96' font-weight='900' fill='#f36a12' text-anchor='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}