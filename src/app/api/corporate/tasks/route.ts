import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Corporate task system — delegated, entity-linked tasks for Attenda people.
// corporate_tasks columns: id, title, detail, kind, status, priority, due_date,
// client_id, assignee_id, created_by, created_at, completed_at,
// owner_user_id, entity_type, entity_id, entity_label (added 2026-09-03).

export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const base = db.from('corporate_tasks')
    .select('id, title, detail, status, due_date, entity_type, entity_id, entity_label, owner_user_id, created_at, completed_at')
    .not('owner_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  const { data: rows0 } = caller.isSuper
    ? await base
    : await base.eq('owner_user_id', caller.userId);

  const rows = rows0 || [];

  // Resolve owner names (single extra query, merged in JS).
  const ownerIds = Array.from(new Set(rows.map((r) => r.owner_user_id).filter(Boolean))) as string[];
  let nameById: Record<string, string> = {};
  if (ownerIds.length) {
    const { data: owners } = await db.from('corporate_users').select('id, name').in('id', ownerIds);
    nameById = Object.fromEntries((owners || []).map((o) => [o.id, o.name]));
  }

  const tasks = rows.map((r) => ({ ...r, owner_name: nameById[r.owner_user_id as string] || 'Team' }));
  const openCount = tasks.filter((t) => t.status !== 'done').length;

  return NextResponse.json({ tasks, openCount });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = b.action;

  if (action === 'create') {
    if (!caller.isSuper) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
    if (!b.owner_user_id || !b.title) return NextResponse.json({ error: 'owner_user_id and title required' }, { status: 400 });
    const { data, error } = await db.from('corporate_tasks').insert({
      title: String(b.title).slice(0, 300),
      detail: b.detail ? String(b.detail).slice(0, 2000) : null,
      kind: 'assigned',
      status: 'open',
      priority: b.priority || 'normal',
      due_date: b.due_date || null,
      owner_user_id: b.owner_user_id,
      entity_type: b.entity_type || null,
      entity_id: b.entity_id || null,
      entity_label: b.entity_label || null,
      created_by: caller.userId,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, task: data });
  }

  if (action === 'complete') {
    const { data: row } = await db.from('corporate_tasks').select('id, owner_user_id').eq('id', b.id).maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.owner_user_id !== caller.userId && !caller.isSuper) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { error } = await db.from('corporate_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', b.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}