import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller, resolveHotelScope, getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'kpi';
    const hotelId = searchParams.get('hotelId');

    const db = getSupabaseAdmin();
    const table = type === 'todo' ? 'todo_packs' : 'kpi_packs';
    const installTable = type === 'todo' ? 'todo_pack_installs' : 'kpi_pack_installs';

    const { data: packs, error } = await db
      .from(table)
      .select('*')
      .eq('is_public', true)
      .order('install_count', { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    let installedPackIds: string[] = [];
    if (hotelId) {
      const { data: installs } = await db
        .from(installTable)
        .select('pack_id')
        .eq('hotel_id', hotelId);
      installedPackIds = (installs || []).map((r: any) => r.pack_id);
    }

    return NextResponse.json({ ok: true, packs: packs || [], installedPackIds });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, packId, hotelId } = body as { action: string; packId: string; hotelId?: string };

    const scopedHotelId = resolveHotelScope(caller, hotelId);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!scopedHotelId || !UUID_RE.test(scopedHotelId)) {
      return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    if (action === 'install_kpi_pack') {
      const { data: pack, error: packErr } = await db
        .from('kpi_packs')
        .select('*')
        .eq('id', packId)
        .single();
      if (packErr || !pack) return NextResponse.json({ ok: false, error: 'Pack not found' }, { status: 404 });

      const items: any[] = Array.isArray(pack.items) ? pack.items : JSON.parse(pack.items || '[]');

      // Fetch existing KPI definition names to avoid duplicates
      const { data: existing } = await db
        .from('requests')
        .select('details')
        .eq('hotel_id', scopedHotelId)
        .eq('type', 'kpi_definition')
        .eq('status', 'active');

      const existingNames = new Set(
        (existing || []).map((r: any) => {
          const d = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
          return (d?.kpi_name || '').toLowerCase();
        })
      );

      let installed = 0;
      for (const item of items) {
        if (existingNames.has((item.name || '').toLowerCase())) continue;
        await db.from('requests').insert({
          hotel_id: scopedHotelId,
          type: 'kpi_definition',
          status: 'active',
          guest_name: 'STAFF',
          room: 'KPI',
          details: JSON.stringify({
            kpi_name: item.name,
            unit: item.unit || 'count',
            target: item.target || 0,
            frequency: item.frequency || 'daily',
            category: item.category || 'Operations',
            why: item.why || '',
            pack_id: packId,
          }),
        });
        installed++;
      }

      // Record install (idempotent via unique constraint)
      await db.from('kpi_pack_installs').upsert(
        { pack_id: packId, hotel_id: scopedHotelId, installed_by: caller.name || 'admin' },
        { onConflict: 'pack_id,hotel_id', ignoreDuplicates: true }
      );

      // Increment install_count
      await db.rpc('increment_pack_install_count', { p_table: 'kpi_packs', p_id: packId }).maybeSingle();
      // Fallback: raw update if RPC doesn't exist
      await db.from('kpi_packs').update({ install_count: (pack.install_count || 0) + 1 }).eq('id', packId);

      return NextResponse.json({ ok: true, installed });
    }

    if (action === 'install_todo_pack') {
      const { data: pack, error: packErr } = await db
        .from('todo_packs')
        .select('*')
        .eq('id', packId)
        .single();
      if (packErr || !pack) return NextResponse.json({ ok: false, error: 'Pack not found' }, { status: 404 });

      // Check not already installed
      const { data: existingInstall } = await db
        .from('todo_pack_installs')
        .select('id')
        .eq('pack_id', packId)
        .eq('hotel_id', scopedHotelId)
        .maybeSingle();

      if (!existingInstall) {
        // Create template
        const { data: template } = await db
          .from('position_todo_templates')
          .insert({
            hotel_id: scopedHotelId,
            name: pack.name,
            description: pack.description || '',
            department: pack.department || 'front_desk',
            is_active: true,
          })
          .select()
          .single();

        if (template) {
          const items: any[] = Array.isArray(pack.items) ? pack.items : JSON.parse(pack.items || '[]');
          for (const item of items) {
            await db.from('position_todo_items').insert({
              template_id: template.id,
              label: item.label,
              item_type: item.item_type || 'checkbox',
              required: item.required ?? false,
              sort_order: item.sort_order || 0,
              config: item.config || {},
            });
          }
        }

        await db.from('todo_pack_installs').insert({
          pack_id: packId,
          hotel_id: scopedHotelId,
          installed_by: caller.name || 'admin',
        });

        await db.from('todo_packs').update({ install_count: (pack.install_count || 0) + 1 }).eq('id', packId);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
