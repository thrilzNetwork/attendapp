import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller, resolveHotelScope, getSupabaseAdmin } from '@/lib/supabase-admin';

interface OrderRow {
  partner_id: string | null;
  total_amount: number | null;
  vendor_payout: number | null;
  vendor_status: string | null;
}

interface PartnerRow {
  id: string;
  name: string;
}

interface PartnerSummary {
  partner_id: string;
  partner_name: string;
  order_count: number;
  gross_revenue: number;
  commission_earned: number;
  vendor_payout_total: number;
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
    const { action, hotelId, fromDate, toDate } = body as {
      action: string;
      hotelId?: string;
      fromDate?: string;
      toDate?: string;
    };

    if (action !== 'get_revenue_summary') {
      return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    const scopedHotelId = resolveHotelScope(caller, hotelId);
    if (!scopedHotelId) {
      return NextResponse.json({ ok: false, error: 'No hotel in scope.' }, { status: 400 });
    }

    if (!fromDate || !toDate) {
      return NextResponse.json({ ok: false, error: 'fromDate and toDate are required.' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // ── Query 1: food/drink orders ──────────────────────────────────────────
    const { data: orders, error: ordersError } = await db
      .from('requests')
      .select('partner_id, total_amount, vendor_payout, vendor_status')
      .eq('hotel_id', scopedHotelId)
      .not('vendor_status', 'is', null)
      .not('total_amount', 'is', null)
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (ordersError) {
      console.error('revenue orders query error:', ordersError.message);
      return NextResponse.json({ ok: false, error: ordersError.message }, { status: 500 });
    }

    const rows = (orders || []) as OrderRow[];

    // Aggregate by partner_id in JS
    const partnerMap = new Map<string, PartnerSummary>();
    for (const row of rows) {
      const pid = row.partner_id || '__none__';
      const amount = row.total_amount ?? 0;
      const payout = row.vendor_payout ?? 0;

      if (!partnerMap.has(pid)) {
        partnerMap.set(pid, {
          partner_id: pid,
          partner_name: '',
          order_count: 0,
          gross_revenue: 0,
          commission_earned: 0,
          vendor_payout_total: 0,
        });
      }
      const entry = partnerMap.get(pid)!;
      entry.order_count += 1;
      entry.gross_revenue += amount;
      entry.commission_earned += amount - payout;
      entry.vendor_payout_total += payout;
    }

    // Fetch partner names for known partner_ids
    const partnerIds = Array.from(partnerMap.keys()).filter((id) => id !== '__none__');
    if (partnerIds.length > 0) {
      const { data: partners } = await db
        .from('partners')
        .select('id, name')
        .in('id', partnerIds);

      for (const p of (partners || []) as PartnerRow[]) {
        const entry = partnerMap.get(p.id);
        if (entry) entry.partner_name = p.name;
      }
    }

    // Round figures to 2 decimal places
    const byPartner: PartnerSummary[] = Array.from(partnerMap.values()).map((p) => ({
      ...p,
      gross_revenue: +p.gross_revenue.toFixed(2),
      commission_earned: +p.commission_earned.toFixed(2),
      vendor_payout_total: +p.vendor_payout_total.toFixed(2),
    }));

    // ── Query 2: shuttle revenue ────────────────────────────────────────────
    // TODO: query shuttle_bookings joined to shuttle_slots → shuttle_routes
    // where hotel_id matches and price_charged > 0 and status = 'confirmed'.
    // Skipped for now — shuttle_bookings has no direct hotel_id column and
    // the multi-hop join needs verification against the live schema.
    const shuttleRevenue = 0;

    // ── Totals ──────────────────────────────────────────────────────────────
    const totals = byPartner.reduce(
      (acc, p) => ({
        gross: +(acc.gross + p.gross_revenue).toFixed(2),
        commission: +(acc.commission + p.commission_earned).toFixed(2),
        orders: acc.orders + p.order_count,
      }),
      { gross: 0, commission: 0, orders: 0 },
    );

    return NextResponse.json({
      ok: true,
      byPartner,
      shuttleRevenue,
      totals,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('revenue route error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
