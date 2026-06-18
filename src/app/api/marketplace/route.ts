import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller, resolveHotelScope } from '@/lib/supabase-admin';
import { validateApiKey, isAllowedOrigin, originBlocked } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) return originBlocked();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'kpi';
  const hotelId = searchParams.get('hotelId');
  const db = getSupabaseAdmin();

  if (type === 'kpi') {
    const [{ data: packs }, { data: installs }] = await Promise.all([
      db.from('kpi_packs').select('*').eq('is_public', true).order('install_count', { ascending: false }),
      hotelId
        ? db.from('kpi_pack_installs').select('pack_id').eq('hotel_id', hotelId)
        : Promise.resolve({ data: [] }),
    ]);
    const installedPackIds = (installs || []).map((i: any) => i.pack_id);
    return NextResponse.json({ ok: true, packs: packs || [], installedPackIds });
  } else {
    const [{ data: packs }, { data: installs }] = await Promise.all([
      db.from('todo_packs').select('*').eq('is_public', true).order('install_count', { ascending: false }),
      hotelId
        ? db.from('todo_pack_installs').select('pack_id').eq('hotel_id', hotelId)
        : Promise.resolve({ data: [] }),
    ]);
    const installedPackIds = (installs || []).map((i: any) => i.pack_id);
    return NextResponse.json({ ok: true, packs: packs || [], installedPackIds });
  }
}

export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) return originBlocked();

  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ ok: false, error: 'Auth required' }, { status: 401 });

  const body = await req.json();
  const { action, packId, hotelId: rawHotelId, installedBy } = body;
  const hotelId = resolveHotelScope(caller, rawHotelId);
  if (!hotelId) return NextResponse.json({ ok: false, error: 'No hotel in scope' }, { status: 400 });

  const db = getSupabaseAdmin();

  if (action === 'install_kpi_pack') {
    const { data: pack } = await db.from('kpi_packs').select('*').eq('id', packId).maybeSingle();
    if (!pack) return NextResponse.json({ ok: false, error: 'Pack not found' }, { status: 404 });

    const { data: existingKpis } = await db
      .from('requests')
      .select('details')
      .eq('hotel_id', hotelId)
      .eq('type', 'kpi_definition');

    const existingNames = new Set(
      (existingKpis || []).map((r: any) => (r.details?.kpi_name || '').toLowerCase())
    );

    const items: any[] = pack.items || [];
    let installed = 0;
    for (const item of items) {
      if (existingNames.has((item.name || '').toLowerCase())) continue;
      await db.from('requests').insert({
        hotel_id: hotelId,
        type: 'kpi_definition',
        status: 'active',
        details: {
          kpi_name: item.name,
          unit: item.unit,
          target: item.target,
          frequency: item.frequency || 'daily',
          category: item.category || 'Operations',
          why: item.why || '',
          pack_id: packId,
        },
      });
      installed++;
    }

    await db
      .from('kpi_pack_installs')
      .upsert({ pack_id: packId, hotel_id: hotelId, installed_by: installedBy }, { onConflict: 'pack_id,hotel_id' });
    await db
      .from('kpi_packs')
      .update({ install_count: (pack.install_count || 0) + 1 })
      .eq('id', packId);

    return NextResponse.json({ ok: true, installed });
  }

  if (action === 'install_todo_pack') {
    const { data: pack } = await db.from('todo_packs').select('*').eq('id', packId).maybeSingle();
    if (!pack) return NextResponse.json({ ok: false, error: 'Pack not found' }, { status: 404 });

    const { data: template, error: tErr } = await db
      .from('position_todo_templates')
      .insert({
        hotel_id: hotelId,
        name: pack.name,
        description: pack.description || '',
        department: pack.department || 'General',
        shift: pack.shift || 'All Shifts',
        estimated_minutes: pack.estimated_minutes || 30,
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (tErr || !template) {
      return NextResponse.json({ ok: false, error: tErr?.message || 'Template insert failed' }, { status: 500 });
    }

    const items: any[] = pack.items || [];
    for (const item of items) {
      await db.from('position_todo_items').insert({
        template_id: template.id,
        label: item.label,
        item_type: item.item_type || 'checkbox',
        required: item.required ?? true,
        sort_order: item.sort_order || 0,
        config: item.config || {},
      });
    }

    await db
      .from('todo_pack_installs')
      .upsert({ pack_id: packId, hotel_id: hotelId, installed_by: installedBy }, { onConflict: 'pack_id,hotel_id' });
    await db
      .from('todo_packs')
      .update({ install_count: (pack.install_count || 0) + 1 })
      .eq('id', packId);

    return NextResponse.json({ ok: true, templateId: template.id });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
