'use client';

/* Shared chrome for the three demo tenant pages (landing / app / admin).
   Floating switcher + Attenda Serve demo trial bar. */

import Link from 'next/link';
import { Store, LayoutDashboard, Globe, ExternalLink } from 'lucide-react';
import { TRIAL_MS } from './serve-demo-store';

const INK = '#15202B';
const NAVY = '#1B1F3B';
const TEAL = '#2BB8B2';

export const demoTokens = { INK, NAVY, TEAL, CREAM: '#F3F0E6', PAPER: '#FFFFFF', TEAL_INK: '#0E5F5B' };
export const demoShadow = '4px 4px 0 var(--sv-ink, #15202B)';
export const demoShadowSm = '2px 2px 0 var(--sv-ink, #15202B)';

export function DemoSwitcher({ demoId, mode }: { demoId: string; mode: 'landing' | 'app' | 'admin' }) {
  const items = [
    { m: 'landing' as const, label: 'Landing', icon: Globe, href: `/serve/demo/${demoId}` },
    { m: 'app' as const, label: 'Tienda', icon: Store, href: `/serve/demo/${demoId}/app` },
    { m: 'admin' as const, label: 'Admin', icon: LayoutDashboard, href: `/serve/demo/${demoId}/admin` },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto max-w-xs pointer-events-auto">
        <div className="flex items-center rounded-xl border-2 p-1" style={{ backgroundColor: INK, borderColor: INK, boxShadow: `3px 3px 0 ${TEAL}` }}>
          {items.map(({ m, label, icon: Icon, href }) => (
            <Link key={m} href={href}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-extrabold transition-all"
              style={m === mode
                ? { backgroundColor: TEAL, color: INK, fontFamily: 'Archivo, sans-serif' }
                : { color: 'rgba(243,240,230,0.75)' }}>
              <Icon size={14} strokeWidth={2.5} /> {label}
            </Link>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white/60" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          <ExternalLink size={9} className="mr-1 inline" />
          Demo creada con <Link href="/serve" className="underline" style={{ color: TEAL }}>Attenda Serve</Link> · 0% comisión
        </p>
      </div>
    </div>
  );
}

export function TrialBar({ createdAt }: { createdAt: number }) {
  const left = Math.max(0, (createdAt + TRIAL_MS - Date.now()) / 3600000);
  const label = left > 1 ? `${Math.floor(left)}h ${Math.round((left % 1) * 60)}m` : `${Math.max(1, Math.round(left * 60))}m`;
  return (
    <div className="border-b-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-bold text-white">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAL }} />
        Demo activa · expira en {label} · <Link href="/serve" className="underline" style={{ color: TEAL }}>Attenda Serve</Link>
      </div>
    </div>
  );
}