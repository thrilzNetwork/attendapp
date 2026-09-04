'use client';

/* ═══════════════════════════════════════════ components/v2/V2ComingSoon.tsx
   Generic stub for V2 modules that have a sidebar row (per the approved
   16-module nav) but no built screen yet — Inspections, Maintenance,
   Housekeeping. Keeps the sidebar demoable without inventing fake data
   for modules that have no backing tables yet (DB gap, future work).
   ═════════════════════════════════════════════════════════════════════ */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { V2ScreenHeader, V2Panel } from './ui';

export default function V2ComingSoon({
  icon: Icon, title, subtitle, description,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader title={title} subtitle={subtitle} />
      <V2Panel title="Coming soon">
        <div className="flex flex-col items-center text-center py-14 gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#E4F5F3' }}>
            <Icon size={22} style={{ color: '#0E7C74' }} />
          </div>
          <p className="text-[15px] font-bold" style={{ color: '#16233B' }}>{title} is on the V2 roadmap</p>
          <p className="text-[13px] max-w-md" style={{ color: '#5B6B7E' }}>{description}</p>
        </div>
      </V2Panel>
    </div>
  );
}
