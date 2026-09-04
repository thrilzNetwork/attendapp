'use client';

/* ═══════════════════════════════════════════ components/v2/V2RightAnswers.tsx
   Attenda V2 — Right Answers / SOPs (module 3). No mockup image exists for
   this module; built from the brief's text description: "Searchable
   manager-maintained KB: SOP library, categories, departments, versions,
   status, last update, simple Q/A." Explicitly NOT an autonomous agent.

   NOW    — KPI strip (published answers, categories, updated this week, pending review)
   WORK   — the existing IncidentKBView (search, submit, PDF upload, approve/reject)
   ACTION — approve/reject/restore controls already live inside IncidentKBView
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, FolderOpen, Clock3, HelpCircle } from 'lucide-react';
import { V2KpiCard, V2ScreenHeader } from './ui';
import { listKbSuggestionsByStatus, type OpRecord } from '@/lib/opsStore';

const IncidentKBView = dynamic(() => import('@/components/staff/IncidentKBView'), { ssr: false });

export default function V2RightAnswers({ hotelId, isAdmin, userName }: { hotelId: string; isAdmin: boolean; userName: string }) {
  const [approved, setApproved] = useState<OpRecord[]>([]);
  const [pending, setPending] = useState<OpRecord[]>([]);
  const [asOf, setAsOf] = useState('');

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    (async () => {
      const [a, p] = await Promise.all([
        listKbSuggestionsByStatus(hotelId, 'active').catch(() => []),
        listKbSuggestionsByStatus(hotelId, 'pending').catch(() => []),
      ]);
      setApproved(a || []);
      setPending(p || []);
    })();
  }, [hotelId]);

  const categories = new Set(approved.map(e => (e.details as any)?.category).filter(Boolean));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const updatedThisWeek = approved.filter(e => new Date(e.created_at || 0).getTime() >= weekAgo).length;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Right Answers"
        subtitle="Searchable SOP library, best practices, and GM guidance — how we do this correctly."
        banner="Reference library with a suggest/approve workflow. Not an autonomous agent."
        dataAsOf={asOf}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <V2KpiCard icon={BookOpen} label="Published answers" value={approved.length} sub="Live in the library" subTone="green" />
        <V2KpiCard icon={FolderOpen} label="Categories" value={categories.size} sub="In use" />
        <V2KpiCard icon={Clock3} label="Updated this week" value={updatedThisWeek} sub="Last 7 days" />
        <V2KpiCard icon={HelpCircle} label="Pending review" value={pending.length}
          sub={pending.length ? 'Needs admin review' : 'Queue clear'} subTone={pending.length ? 'amber' : 'green'} />
      </div>

      <div className="bg-white rounded-2xl border" style={{ borderColor: '#E5EAF0' }}>
        <IncidentKBView hotelId={hotelId} isAdmin={isAdmin} userName={userName} />
      </div>
    </div>
  );
}
