import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

type PersonCapRow = { capability_key: string; proficiency: string; is_accountable: boolean; user: { id: string; name: string | null } | null };

// GET /api/corporate/hq — Attenda HQ operating system.
// Information follows responsibility: members see their capabilities, tools,
// their clients' workspaces + signals routed to them. Super admin sees all.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Unauthorized' }, 401);
  const db = getSupabaseAdmin();

  const { data: me } = await db.from('corporate_users').select('id, name, status, active').eq('id', caller.userId).maybeSingle();
  if (!me || !me.active) return json({ error: 'Not a corporate user' }, 403);
  const isSuper = !!caller.isSuper;

  const [caps, personCaps, agents, tools, myTools, spaces, building, assignments, clientCaps] = await Promise.all([
    db.from('hq_capabilities').select('*').order('sort_order'),
    db.from('hq_person_capabilities').select('capability_key, proficiency, is_accountable, user:corporate_users(id, name)').order('capability_key'),
    db.from('hq_agents').select('*').order('name'),
    db.from('hq_tools').select('*').order('sort_order'),
    db.from('hq_user_tools').select('access_granted, note, tool:hq_tools(id, name, category, why, url)').eq('user_id', caller.userId),
    db.from('hq_spaces').select('*').order('created_at'),
    db.from('hq_building_posts').select('*').eq('published', true).order('created_at', { ascending: false }).limit(30),
    db.from('corporate_client_assignments').select('client_id, client:corporate_clients(id, slug, name, brand, rooms)').eq('user_id', caller.userId).eq('active', true),
    db.from('hq_client_capabilities').select('*, hq_capabilities(name), hq_agents(name), owner:corporate_users(id, name)'),
  ]);

  // Signals: assigned to me — super admin sees all.
  const sigBase = db.from('hq_signals').select('*, corporate_clients(name), hq_capabilities(name), hq_agents(name), assignee:corporate_users(name)').order('created_at', { ascending: false }).limit(100);
  const { data: signals } = isSuper ? await sigBase : await sigBase.eq('assigned_user_id', caller.userId);

  const pc = (personCaps.data || []) as unknown as PersonCapRow[];
  const myCapabilities = pc.filter((r) => r.user?.id === caller.userId).map((r) => ({ key: r.capability_key, proficiency: r.proficiency, accountable: r.is_accountable }));
  const capabilityHolders = pc.filter((r) => r.user && r.user.id !== caller.userId).map((r) => ({ key: r.capability_key, user_id: r.user!.id, name: r.user!.name, accountable: r.is_accountable, proficiency: r.proficiency }));

  const myClients = (assignments.data || []).map((a: { client: unknown }) => a.client).filter(Boolean) as { id: string; slug: string; name: string; brand: string | null; rooms: number | null }[];
  const myClientIds = myClients.map((c) => c.id);

  // Spaces: client spaces for my clients + company capability spaces (open to all active members).
  const visibleSpaces = (spaces.data || []).filter((s: { kind: string; client_id: string | null }) => {
    if (isSuper) return true;
    if (s.kind === 'client') return myClientIds.includes(s.client_id || '');
    return true; // capability spaces are open company spaces
  });

  const spaceIds = visibleSpaces.map((s: { id: string }) => s.id);
  const { data: spacePosts } = spaceIds.length
    ? await db.from('hq_space_posts').select('*, hq_agents(name), corporate_users(name)').in('space_id', spaceIds).order('created_at', { ascending: false }).limit(200)
    : { data: [] };

  const { data: people } = isSuper
    ? await db.from('corporate_users').select('id, name, title, status').eq('active', true).order('name')
    : { data: [] };

  return json({
    me: { id: me.id, name: me.name, status: me.status || 'active', isSuper },
    capabilities: caps.data || [],
    myCapabilities,
    capabilityHolders,
    agents: (agents.data || []).map((a: { supervisor_id: string | null }) => ({ ...a, mine: a.supervisor_id === caller.userId })),
    tools: tools.data || [],
    myTools: ((myTools.data || []) as any[]).map((t) => {
      const tool = Array.isArray(t?.tool) ? t.tool[0] : t?.tool;
      return tool ? { ...tool, access_granted: t.access_granted, note: t.note } : null;
    }).filter(Boolean),
    spaces: visibleSpaces,
    spacePosts: spacePosts || [],
    building: building.data || [],
    myClients,
    clientCapabilities: (clientCaps.data || []).filter((cc: { client_id: string }) => isSuper || myClientIds.includes(cc.client_id)),
    signals: signals || [],
    people: people || [],
  });
}

// POST /api/corporate/hq — HQ mutations.
// actions: post-space | act-signal | set-coverage | set-agent | set-owner | grant-tool | post-building
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return json({ error: 'Unauthorized' }, 401);
  const db = getSupabaseAdmin();
  const { data: me } = await db.from('corporate_users').select('id, active, status').eq('id', caller.userId).maybeSingle();
  if (!me || !me.active) return json({ error: 'Not a corporate user' }, 403);
  if ((me.status || 'active') === 'pending') return json({ error: 'Account pending — awaiting super admin' }, 403);
  const isSuper = !!caller.isSuper;

  const b = await req.json().catch(() => ({}));
  const action = b?.action;

  try {
    if (action === 'post-space') {
      const { data: space } = await db.from('hq_spaces').select('id, kind, client_id').eq('id', b.space_id).maybeSingle();
      if (!space) return json({ error: 'Space not found' }, 404);
      if (space.kind === 'client' && space.client_id) {
        const { data: asg } = await db.from('corporate_client_assignments').select('id').eq('user_id', me.id).eq('client_id', space.client_id).eq('active', true).maybeSingle();
        if (!asg && !isSuper) return json({ error: 'Not assigned to this client' }, 403);
      }
      const { data, error } = await db.from('hq_space_posts').insert({
        space_id: b.space_id, author_id: me.id, kind: b.kind || 'update', body: String(b.body || '').slice(0, 4000),
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, post: data });
    }

    if (action === 'act-signal') {
      const { data: sig } = await db.from('hq_signals').select('id, assigned_user_id').eq('id', b.signal_id).maybeSingle();
      if (!sig) return json({ error: 'Signal not found' }, 404);
      if (!isSuper && sig.assigned_user_id !== me.id) return json({ error: 'Not your signal' }, 403);
      const patch: Record<string, unknown> = {};
      if (b.status === 'resolved') { patch.status = 'resolved'; patch.resolved_at = new Date().toISOString(); }
      else if (b.status === 'routed' || b.status === 'new') patch.status = b.status;
      if (b.assigned_user_id && isSuper) patch.assigned_user_id = b.assigned_user_id;
      if (!Object.keys(patch).length) return json({ error: 'Nothing to update' }, 400);
      const { error } = await db.from('hq_signals').update(patch).eq('id', b.signal_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'set-coverage' || action === 'set-agent' || action === 'set-owner' || action === 'grant-tool' || action === 'post-building') {
      if (!isSuper) return json({ error: 'Super admin only' }, 403);

      if (action === 'set-coverage') {
        const cov = ['covered', 'partial', 'gap'].includes(b.coverage) ? b.coverage : 'gap';
        const patch: Record<string, unknown> = { coverage: cov };
        if (['emerging', 'operational', 'strong', 'advanced'].includes(b.maturity)) patch.maturity = b.maturity;
        const { error } = await db.from('hq_capabilities').update(patch).eq('key', b.capability_key);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      if (action === 'set-agent') {
        const patch: Record<string, unknown> = {};
        if ('supervisor_id' in b) patch.supervisor_id = b.supervisor_id || null;
        if (['active', 'paused', 'building'].includes(b.status)) patch.status = b.status;
        if (b.data_permissions !== undefined) patch.data_permissions = String(b.data_permissions || '').slice(0, 2000);
        if (Array.isArray(b.actions_permitted)) patch.actions_permitted = b.actions_permitted.slice(0, 30);
        if (Array.isArray(b.actions_require_approval)) patch.actions_require_approval = b.actions_require_approval.slice(0, 30);
        if (!Object.keys(patch).length) return json({ error: 'Nothing to update' }, 400);
        const { error } = await db.from('hq_agents').update(patch).eq('id', b.agent_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      if (action === 'set-owner') {
        const { error } = await db.from('hq_person_capabilities').upsert({
          user_id: b.user_id, capability_key: b.capability_key,
          is_accountable: !!b.accountable, proficiency: ['emerging', 'operational', 'strong', 'advanced'].includes(b.proficiency) ? b.proficiency : 'operational',
        }, { onConflict: 'user_id,capability_key' });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      if (action === 'grant-tool') {
        const { error } = await db.from('hq_user_tools').upsert({
          user_id: b.user_id, tool_id: b.tool_id, access_granted: !!b.access_granted,
        }, { onConflict: 'user_id,tool_id' });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      // post-building
      const { data, error } = await db.from('hq_building_posts').insert({
        kind: ['now', 'win', 'gap', 'opportunity', 'update'].includes(b.kind) ? b.kind : 'update',
        title: String(b.title || '').slice(0, 200), body: String(b.body || '').slice(0, 4000), published: true,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, post: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return json({ error: msg }, 500);
  }
}