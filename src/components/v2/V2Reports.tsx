'use client';

/* ═══════════════════════════════════════════ components/v2/V2Reports.tsx
   Attenda V2 — Reports (module 16). No mockup exists — concept built per
   §6.2 of the V2 build plan, approved by the owner. Generated from Attenda
   activity only; NEVER the official PMS/accounting record.

   NOW    — KPI strip (requests resolved, avg resolution, todo completion, checklist rate)
   WORK   — the existing ReportsView (range picker + KPI/points/bank/room-move/no-show/request/todo browser)
   ACTION — Quick Actions (Export / Schedule / Full Report) hand off to ReportsView's own controls
   ═════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle2, Timer, ClipboardCheck, BarChart2, Download, CalendarClock, ShieldCheck } from 'lucide-react';
import { V2KpiCard, V2ScreenHeader, V2Panel, V2QuickActions } from './ui';
import { supabase } from '@/lib/supabase';

const ReportsView = dynamic(() => import('@/components/staff/ReportsView'), { ssr: false });

function localDateStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function V2Reports({ hotelId, isAdmin }: { hotelId: string; isAdmin: boolean }) {
  const [asOf, setAsOf] = useState('');
  const [resolved, setResolved] = useState(0);
  const [avgResMin, setAvgResMin] = useState<number | null>(null);
  const [todoRate, setTodoRate] = useState<number | null>(null);

  useEffect(() => {
    if (!hotelId) return;
    setAsOf(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    const from = localDateStr(new Date(Date.now() - 29 * 86400000));
    const to = localDateStr();
    (async () => {
      const [{ data: reqs }, { data: todos }] = await Promise.all([
        supabase.from('requests').select('status,created_at,updated_at')
          .eq('hotel_id', hotelId)
          .not('type', 'in', '(kpi_submission,kpi_definition,checklist_template,checklist_completion,forecast,generated_shift,shift_submission,schedule_change_request,learning_content,hr_document,course,course_module,quiz_question,module_completion,quiz_attempt,shuttle_config,shuttle_slot,shuttle_booking,call_around_log,incident_log,kb_suggestion)')
          .gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
        supabase.from('position_todo_instances').select('status')
          .eq('hotel_id', hotelId).gte('shift_date', from).lte('shift_date', to),
      ]);
      const done = (reqs || []).filter(r => r.status === 'completed' || r.status === 'closed');
      setResolved(done.length);
      const withTimes = done.filter(r => r.created_at && r.updated_at);
      setAvgResMin(withTimes.length
        ? Math.round(withTimes.reduce((a, r) => a + Math.max(0, (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 60000), 0) / withTimes.length)
        : null);
      const totalTodos = (todos || []).length;
      const doneTodos = (todos || []).filter(t => t.status === 'completed').length;
      setTodoRate(totalTodos ? Math.round((doneTodos / totalTodos) * 100) : null);
    })();
  }, [hotelId]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto" style={{ background: '#F6F8FA', minHeight: '100%' }}>
      <V2ScreenHeader
        title="Reports"
        subtitle="What happened inside Attenda — completion, timeliness, and operational compliance."
        banner="Generated from Attenda activity only. Not the official PMS or accounting record."
        dataAsOf={asOf}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start mb-5">
        <div className="xl:col-span-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <V2KpiCard icon={CheckCircle2} label="Requests resolved (30d)" value={resolved} sub="Staff-reported completions" subTone="green" />
          <V2KpiCard icon={Timer} label="Avg resolution time" value={avgResMin != null ? `${avgResMin}m` : '—'} sub="Create → close" />
          <V2KpiCard icon={ClipboardCheck} label="To-do completion (30d)" value={todoRate != null ? `${todoRate}%` : '—'}
            sub={todoRate != null && todoRate >= 90 ? 'On target' : todoRate != null ? 'Below target' : 'No data yet'}
            subTone={todoRate != null && todoRate >= 90 ? 'green' : todoRate != null ? 'amber' : 'gray'} />
        </div>
        <V2Panel title="Quick actions">
          <V2QuickActions actions={[
            { icon: BarChart2, label: 'Full report browser', caption: 'Filter by range and category', onClick: () => document.getElementById('v2-reports-browser')?.scrollIntoView({ behavior: 'smooth' }) },
            { icon: Download, label: 'Export CSV', caption: 'Use the range picker below, then export' },
            { icon: CalendarClock, label: 'Schedule recurring report', caption: 'Coming soon' },
            { icon: ShieldCheck, label: 'Compliance audit', caption: 'Coming soon' },
          ]} />
        </V2Panel>
      </div>

      <div id="v2-reports-browser" className="bg-white rounded-2xl border" style={{ borderColor: '#E5EAF0' }}>
        <ReportsView hotelId={hotelId} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
