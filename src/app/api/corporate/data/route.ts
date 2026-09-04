import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Shared corporate workspace data: tasks, calendar, pipeline, clients, team.
// All callers must be active corporate users. Super admins get everything;
// regular members get data scoped to nothing (corporate is shared) — the
// property switcher filters on the client, RLS/service-role here is by membership.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const { data: me } = await db.from('corporate_users').select('*').eq('id', caller.userId).maybeSingle();
  if (!me || !me.active) return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 });

  const [tasks, events, pipeline, clients, team, comments] = await Promise.all([
    db.from('corporate_tasks').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('corporate_events').select('*').order('start_at').limit(300),
    db.from('corporate_pipeline').select('*').order('created_at', { ascending: false }),
    db.from('corporate_clients').select('*').order('name'),
    db.from('corporate_users').select('id, name, title, confirmed_position, avatar_url').eq('active', true),
    db.from('corporate_comments').select('*').order('created_at').limit(500),
  ]);

  return NextResponse.json({
    me: { id: me.id, name: me.name, title: me.title, confirmedPosition: me.confirmed_position },
    tasks: tasks.data || [],
    events: events.data || [],
    pipeline: pipeline.data || [],
    clients: clients.data || [],
    team: team.data || [],
    comments: comments.data || [],
  });
}

// POST /api/corporate/data — action-dispatched writes.
// actions: create-task | toggle-task | create-event | delete-event |
//          create-pipeline | move-pipeline | add-comment
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabaseAdmin();

  const { data: me } = await db.from('corporate_users').select('id, active, onboarding_completed').eq('id', caller.userId).maybeSingle();
  if (!me || !me.active || !me.onboarding_completed) {
    return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const action = b.action;

  try {
    if (action === 'create-task') {
      const { data, error } = await db.from('corporate_tasks').insert({
        title: b.title, detail: b.detail || null, kind: b.kind || 'task',
        priority: b.priority || 'normal', due_date: b.due_date || null,
        client_id: b.client_id || null, assignee_id: b.assignee_id || null,
        created_by: caller.userId,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, task: data });
    }

    if (action === 'toggle-task') {
      const done = !!b.done;
      const { data, error } = await db.from('corporate_tasks').update({
        status: done ? 'done' : 'open', completed_at: done ? new Date().toISOString() : null,
      }).eq('id', b.task_id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, task: data });
    }

    if (action === 'create-event') {
      const { data, error } = await db.from('corporate_events').insert({
        title: b.title, detail: b.detail || null, start_at: b.start_at,
        end_at: b.end_at || null, all_day: !!b.all_day,
        client_id: b.client_id || null, created_by: caller.userId,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, event: data });
    }

    if (action === 'delete-event') {
      await db.from('corporate_events').delete().eq('id', b.event_id);
      return NextResponse.json({ ok: true });
    }

    if (action === 'create-pipeline') {
      const { data, error } = await db.from('corporate_pipeline').insert({
        name: b.name, property_name: b.property_name || null, stage: b.stage || 'lead',
        value: b.value || null, next_follow_up: b.next_follow_up || null,
        owner_id: b.owner_id || me.id, notes: b.notes || null, client_id: b.client_id || null,
        created_by: caller.userId,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deal: data });
    }

    if (action === 'move-pipeline') {
      const { data, error } = await db.from('corporate_pipeline').update({
        stage: b.stage, next_follow_up: b.next_follow_up || null,
      }).eq('id', b.deal_id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deal: data });
    }

    if (action === 'add-comment') {
      // mentions: array of corporate user ids parsed from @Name in the body.
      const { data: team } = await db.from('corporate_users').select('id, name');
      const mentioned = (team || [])
        .filter((t: any) => t.name && b.body?.includes(`@${t.name}`))
        .map((t: any) => t.id);
      const { data, error } = await db.from('corporate_comments').insert({
        parent_type: b.parent_type, parent_id: b.parent_id, author_id: me.id,
        body: b.body, mentions: mentioned, client_id: b.client_id || null,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, comment: data });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}