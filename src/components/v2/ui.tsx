'use client';

/* ═════════════════════════════════════════ components/v2/ui.tsx
   Attenda V2 — shared signature components, built from the approved
   mockups. Pure presentation: no data fetching, no effects, no
   subscriptions. Every screen composes these.

   Formula: NOW (KPI strip) → WORK (table) → ACTION (ActionRail).
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

/* ── Status pill ─────────────────────────────────────────────
   Tint bg + colored text. tone maps straight to tokens.      */
export type V2Tone = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'teal' | 'gray';

const TONE_BG: Record<V2Tone, string> = {
  red: '#FDECEC', amber: '#FEF4E4', green: '#E7F6EC',
  blue: '#EAF1FD', purple: '#F1EDFB', teal: '#E4F5F3', gray: '#EEF1F4',
};
const TONE_FG: Record<V2Tone, string> = {
  red: '#DC2626', amber: '#D97706', green: '#16A34A',
  blue: '#2F6FEB', purple: '#7C5CE0', teal: '#0E7C74', gray: '#5B6B7E',
};

export function V2Pill({ label, tone }: { label: string; tone: V2Tone }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ backgroundColor: TONE_BG[tone], color: TONE_FG[tone] }}
    >
      {label}
    </span>
  );
}

/* Maps any free-text status to the closest pill tone. */
export function v2StatusTone(status: string): V2Tone {
  const s = status.toLowerCase();
  if (/open|pending|failed|critical|overdue|dirty|due|urgent/.test(s)) return 'red';
  if (/attention|delayed|review|warning|low|watch/.test(s)) return 'amber';
  if (/complet|done|active|good|inspected|published|paid|approved/.test(s)) return 'green';
  if (/progress|scheduled|assigned|in-progress/.test(s)) return 'blue';
  return 'gray';
}

/* ── KPI card ──────────────────────────────────────────────── */
export function V2KpiCard({ icon: Icon, label, value, sub, subTone = 'gray', onClick }:
  { icon: LucideIcon; label: string; value: string | number; sub?: string; subTone?: V2Tone; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow"
      style={{ borderColor: '#E5EAF0' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: TONE_BG.teal }}>
          <Icon size={16} style={{ color: TONE_FG.teal }} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: '#5B6B7E' }}>{label}</span>
      </div>
      <div>
        <div className="text-[26px] font-bold leading-none" style={{ color: '#16233B' }}>{value}</div>
        {sub && <div className="text-[11px] font-semibold mt-1.5" style={{ color: TONE_FG[subTone] }}>{sub}</div>}
      </div>
    </button>
  );
}

/* ── Panel ─────────────────────────────────────────────────── */
export function V2Panel({ title, action, children, className = '' }:
  { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border flex flex-col ${className}`} style={{ borderColor: '#E5EAF0' }}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <h3 className="text-[14px] font-bold" style={{ color: '#16233B' }}>{title}</h3>
        {action}
      </div>
      <div className="px-4 pb-4 flex-1">{children}</div>
    </section>
  );
}

/* ── ScreenHeader — page header pattern from mockups ─────────
   greeting / H1 / subtitle + right-side actions + "Data as of" */
export function V2ScreenHeader({ greeting, title, subtitle, dataAsOf, right }:
  { greeting?: string; title: string; subtitle?: string; dataAsOf?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        {greeting && <p className="text-[13px] font-medium" style={{ color: '#5B6B7E' }}>👋 {greeting}</p>}
        <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: '#16233B' }}>{title}</h1>
        {subtitle && <p className="text-[13px] mt-1" style={{ color: '#5B6B7E' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {right}
        {dataAsOf && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EEF1F4', color: '#5B6B7E' }}>
            Data as of {dataAsOf}
          </span>
        )}
      </div>
    </div>
  );
}