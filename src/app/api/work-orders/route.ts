import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller, resolveHotelScope } from '@/lib/supabase-admin';
import { isAllowedOrigin } from '@/lib/api-auth';

/**
 * POST /api/work-orders  (staff, authed) — create or update a work order.
 * Create body: { location, issue, priority?, assigned_to?, parts_used?, hotelId? }
 * Update body: { id, status ('in_progress'|'resolved'), parts_used? }
 * Hotel scope is resolved server-side from the staff session.
 */
export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // ── Update path ──
  if (body.id) {
    const existing = await supabase
      .from('work_orders')
      .select('id, hotel_id')
      .eq('id', String(body.id))
      .limit(1);
    const wo = (existing.data || [])[0] as { id: string; hotel_id: string } | undefined;
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    const hotelId = resolveHotelScope(caller, body.hotelId || wo.hotel_id);
    if (!hotelId || wo.hotel_id !== hotelId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) {
      const allowed = ['open', 'in_progress', 'resolved'];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
      if (body.status === 'resolved') updates.resolved_at = new Date().toISOString();
    }
    if (typeof body.parts_used === 'string') updates.parts_used = body.parts_used.slice(0, 200);

    const { error } = await supabase.from('work_orders').update(updates).eq('id', wo.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Create path ──
  const hotelId = resolveHotelScope(caller, body.hotelId);
  if (!hotelId) return NextResponse.json({ error: 'No hotel scope' }, { status: 403 });

  const location = String(body.location || '').trim().slice(0, 120);
  const issue = String(body.issue || '').trim().slice(0, 1000);
  if (!location || !issue) {
    return NextResponse.json({ error: 'Location and issue are required' }, { status: 400 });
  }
  const priority = ['low', 'medium', 'high', 'urgent'].includes(body.priority) ? body.priority : 'medium';

  const { data, error } = await supabase
    .from('work_orders')
    .insert({
      hotel_id: hotelId,
      location,
      issue,
      priority,
      status: 'open',
      assigned_to: body.assigned_to ? String(body.assigned_to).slice(0, 80) : null,
      created_by: caller.email || 'Staff',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data?.id });
}

/**
 * GET /api/work-orders?hotelId=…  (staff, authed)
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const hotelId = resolveHotelScope(caller, req.nextUrl.searchParams.get('hotelId'));
  if (!hotelId) return NextResponse.json({ error: 'No hotel scope' }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}