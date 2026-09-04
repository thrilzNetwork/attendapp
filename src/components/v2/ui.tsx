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
   greeting / H1 / subtitle + optional guardrail banner + right-side
   actions (Customize / Refresh) + "Data as of"                */
export function V2ScreenHeader({
  greeting, title, subtitle, banner, dataAsOf, right, customizeLabel, onCustomize, onRefresh,
}: {
  greeting?: string; title: string; subtitle?: string; banner?: string; dataAsOf?: string;
  right?: React.ReactNode; customizeLabel?: string; onCustomize?: () => void; onRefresh?: () => void;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {greeting && <p className="text-[13px] font-medium" style={{ color: '#5B6B7E' }}>👋 {greeting}</p>}
          <h1 className="text-[28px] font-extrabold leading-tight" style={{ color: '#16233B' }}>{title}</h1>
          {subtitle && <p className="text-[13px] mt-1" style={{ color: '#5B6B7E' }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {(onCustomize || customizeLabel) && (
            <button onClick={onCustomize}
              className="text-[12px] font-bold px-3.5 py-2 rounded-xl border hover:bg-gray-50"
              style={{ borderColor: '#E5EAF0', color: '#16233B' }}>
              {customizeLabel || 'Customize Dashboard'}
            </button>
          )}
          {onRefresh && (
            <button onClick={onRefresh}
              className="text-[12px] font-bold px-3.5 py-2 rounded-xl text-white hover:opacity-90 flex items-center gap-1.5"
              style={{ backgroundColor: '#14A8A0' }}>
              Refresh
            </button>
          )}
          {right}
          {dataAsOf && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: '#EEF1F4', color: '#5B6B7E' }}>
              Data as of {dataAsOf}
            </span>
          )}
        </div>
      </div>
      {banner && (
        <div className="mt-3 flex items-center gap-2 text-[12px] font-medium px-3.5 py-2.5 rounded-xl"
          style={{ backgroundColor: '#E4F5F3', color: '#0E7C74' }}>
          <span aria-hidden>ⓘ</span> {banner}
        </div>
      )}
    </div>
  );
}

/* ── QuickActions — icon + label + sub-caption, 2-col grid ──── */
export interface V2QuickAction {
  icon: LucideIcon;
  label: string;
  caption?: string;
  onClick?: () => void;
}

export function V2QuickActions({ actions }: { actions: V2QuickAction[] }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick}
          className="flex items-center gap-2.5 text-left px-2.5 py-2 rounded-xl hover:bg-gray-50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: TONE_BG.teal }}>
            <a.icon size={15} style={{ color: TONE_FG.teal }} />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold leading-tight" style={{ color: '#16233B' }}>{a.label}</div>
            {a.caption && <div className="text-[11px] leading-tight mt-0.5 truncate" style={{ color: '#5B6B7E' }}>{a.caption}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Table — hairline-divided rows + optional pagination footer ─
   Generic column-driven table matching Vendor/Staff Directory /
   Today's Schedule visual pattern.                             */
export interface V2TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
}

export function V2Table<T extends { id?: string | number }>({
  columns, rows, keyField, page, pageSize, totalCount, onPageChange, rowKey,
}: {
  columns: V2TableColumn<T>[];
  rows: T[];
  keyField?: keyof T;
  rowKey?: (row: T, i: number) => string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}) {
  const showPagination = page != null && pageSize != null && totalCount != null && onPageChange;
  const start = page && pageSize ? (page - 1) * pageSize + 1 : 1;
  const end = page && pageSize ? Math.min(page * pageSize, totalCount || 0) : rows.length;
  const totalPages = pageSize && totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left" style={{ color: '#5B6B7E' }}>
              {columns.map(c => (
                <th key={c.key} className={`font-semibold pb-2 pr-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey ? rowKey(row, i) : (keyField ? String(row[keyField]) : i)} className="border-t" style={{ borderColor: '#E5EAF0' }}>
                {columns.map(c => (
                  <td key={c.key} className={`py-2.5 pr-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-[13px] py-6 text-center" style={{ color: '#5B6B7E' }}>No rows to show.</p>
        )}
      </div>
      {showPagination && rows.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-[12px]" style={{ color: '#5B6B7E' }}>
          <span>Showing {start} to {end} of {totalCount}</span>
          <div className="flex items-center gap-1">
            <button disabled={page! <= 1} onClick={() => onPageChange!(page! - 1)}
              className="px-2 py-1 rounded-lg border disabled:opacity-30" style={{ borderColor: '#E5EAF0' }}>‹</button>
            <span className="px-2 font-semibold" style={{ color: '#16233B' }}>{page}</span>
            <span>/ {totalPages}</span>
            <button disabled={page! >= totalPages} onClick={() => onPageChange!(page! + 1)}
              className="px-2 py-1 rounded-lg border disabled:opacity-30" style={{ borderColor: '#E5EAF0' }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}