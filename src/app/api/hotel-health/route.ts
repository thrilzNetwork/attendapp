import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    // Auth check: verify the caller is the superadmin
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const admin = await isSuperAdmin(user.id);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch hotels
    const { data: hotels } = await supabaseAdmin
      .from('hotels')
      .select('id, slug, name, room_count, is_active')
      .order('name');

    if (!hotels?.length) {
      return NextResponse.json({ hotels: [], totals: zeroTotals() });
    }

  // Fetch aggregated metrics per hotel in parallel
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    const [
      requestsData,
      ordersData,
      feesData,
      partnersData,
      staffData,
    ] = await Promise.all([
      // Today's requests by hotel (indexed on hotel_id + created_at)
      supabaseAdmin
        .from('requests')
        .select('hotel_id, status')
        .gte('created_at', today),
      // This week's requests
      supabaseAdmin
        .from('requests')
        .select('hotel_id')
        .gte('created_at', weekAgo),
      // This month's fees
      supabaseAdmin
        .from('attenda_fees')
        .select('hotel_id, amount')
        .gte('created_at', monthStart),
      // All partners
      supabaseAdmin
        .from('partners')
        .select('hotel_id, id, name'),
      // All staff
      supabaseAdmin
        .from('staff_accounts')
        .select('hotel_id'),
    ]);

    // Build lookup maps (O(n) instead of per-hotel filters)
    const partnerCountMap: Record<string, number> = {};
    (partnersData.data || []).forEach(p => {
      partnerCountMap[p.hotel_id] = (partnerCountMap[p.hotel_id] || 0) + 1;
    });

    const staffCountMap: Record<string, number> = {};
    (staffData.data || []).forEach(s => {
      staffCountMap[s.hotel_id] = (staffCountMap[s.hotel_id] || 0) + 1;
    });

    // Build today's request counts per hotel
    const requestsTodayMap: Record<string, number> = {};
    (requestsData.data || []).forEach(r => {
      requestsTodayMap[r.hotel_id] = (requestsTodayMap[r.hotel_id] || 0) + 1;
    });

    const requestsWeekMap: Record<string, number> = {};
    (ordersData.data || []).forEach(r => {
      requestsWeekMap[r.hotel_id] = (requestsWeekMap[r.hotel_id] || 0) + 1;
    });

    const revenueMap: Record<string, number> = {};
    (feesData.data || []).forEach(f => {
      revenueMap[f.hotel_id] = (revenueMap[f.hotel_id] || 0) + (f.amount || 0);
    });

    // Build hotel health using maps
    const hotelHealth = hotels.map(h => {
      const requestsToday = requestsTodayMap[h.id] || 0;
      const revenueMonth = revenueMap[h.id] || 0;

      return {
        id: h.id,
        slug: h.slug,
        name: h.name,
        roomCount: h.room_count || 0,
        isActive: h.is_active !== false,
        metrics: {
          requestsToday,
          requestsWeek: requestsWeekMap[h.id] || 0,
          foodOrdersToday: 0,
          revenueMonth,
          revenueLifetime: revenueMonth,
          staffCount: staffCountMap[h.id] || 0,
          partnerCount: partnerCountMap[h.id] || 0,
          lastActivity: null,
        },
      };
    });

    const totals = {
      hotels: hotelHealth.length,
      activeHotels: hotelHealth.filter(h => h.isActive).length,
      requestsToday: requestsData.data?.length || 0,
      requestsWeek: ordersData.data?.length || 0,
      foodOrders: 0,
      revenue: hotelHealth.reduce((s, h) => s + h.metrics.revenueMonth, 0),
      partners: hotelHealth.reduce((s, h) => s + h.metrics.partnerCount, 0),
      staff: hotelHealth.reduce((s, h) => s + h.metrics.staffCount, 0),
      rooms: hotelHealth.reduce((s, h) => s + h.roomCount, 0),
    };

    return NextResponse.json({ hotels: hotelHealth, totals });
  } catch (err) {
    console.error('hotel-health error:', err);
    return NextResponse.json({ hotels: [], totals: zeroTotals(), error: String(err) }, { status: 500 });
  }
}

function zeroTotals() {
  return { hotels: 0, activeHotels: 0, requestsToday: 0, requestsWeek: 0, foodOrders: 0, revenue: 0, partners: 0, staff: 0, rooms: 0 };
}