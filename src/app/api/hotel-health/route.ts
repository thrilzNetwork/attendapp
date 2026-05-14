import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: hotels } = await supabase.from('hotels').select('*').order('name');

    if (!hotels?.length) {
      return NextResponse.json({ hotels: [], totals: zeroTotals() });
    }

    // Fetch all metrics in parallel
    const [
      { data: requests },
      { data: orders },
      { data: fees },
      { data: partners },
    ] = await Promise.all([
      supabase.from('requests').select('hotel_id, created_at, status'),
      supabase.from('requests').select('hotel_id, created_at, type').eq('type', 'Food Order'),
      supabase.from('attenda_fees').select('hotel_id, amount, created_at'),
      supabase.from('partners').select('hotel_id, id, name, clover_merchant_id, clover_enabled'),
    ]);

    const partnerCountByHotel = countByHotel(partners || []);
    const cloverPartnersByHotel: Record<string, { id: string; name: string; clover_enabled: boolean }[]> = {};
    (partners || []).forEach(p => {
      if (p.clover_merchant_id) {
        if (!cloverPartnersByHotel[p.hotel_id]) cloverPartnersByHotel[p.hotel_id] = [];
        cloverPartnersByHotel[p.hotel_id].push({ id: p.id, name: p.name, clover_enabled: p.clover_enabled });
      }
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = now.toISOString().slice(0, 7) + '-01';

    const hotelHealth = hotels.map(h => {
      const hotelReqs = (requests || []).filter(r => r.hotel_id === h.id);
      const hotelOrders = (orders || []).filter(o => o.hotel_id === h.id);
      const hotelFees = (fees || []).filter(f => f.hotel_id === h.id);

      const requestsToday = hotelReqs.filter(r => r.created_at >= today).length;
      const requestsWeek = hotelReqs.filter(r => r.created_at >= weekAgo).length;
      const foodOrdersToday = hotelOrders.filter(o => o.created_at >= today).length;
      const revenueMonth = hotelFees.filter(f => f.created_at >= monthStart).reduce((s, f) => s + (f.amount || 0), 0);
      const revenueLifetime = hotelFees.reduce((s, f) => s + (f.amount || 0), 0);
      const lastActivity = hotelReqs.length > 0
        ? hotelReqs.reduce((max, r) => r.created_at > max ? r.created_at : max, '')
        : null;

      return {
        id: h.id,
        slug: h.slug,
        name: h.name,
        roomCount: h.room_count || 0,
        isActive: h.is_active !== false,
        metrics: {
          requestsToday,
          requestsWeek,
          foodOrdersToday,
          revenueMonth,
          revenueLifetime,
          staffCount: 0,
          partnerCount: partnerCountByHotel[h.id] || 0,
          cloverPartnerCount: (cloverPartnersByHotel[h.id] || []).length,
          cloverPartners: cloverPartnersByHotel[h.id] || [],
          lastActivity,
        },
      };
    });

    // Staff counts
    const { data: staff } = await supabase.from('staff_accounts').select('hotel_id');
    const staffByHotel = countByHotel(staff || []);
    hotelHealth.forEach(h => {
      h.metrics.staffCount = staffByHotel[h.id] || 0;
    });

    const totals = {
      hotels: hotelHealth.length,
      activeHotels: hotelHealth.filter(h => h.isActive).length,
      requestsToday: hotelHealth.reduce((s, h) => s + h.metrics.requestsToday, 0),
      requestsWeek: hotelHealth.reduce((s, h) => s + h.metrics.requestsWeek, 0),
      foodOrders: hotelHealth.reduce((s, h) => s + h.metrics.foodOrdersToday, 0),
      revenue: hotelHealth.reduce((s, h) => s + h.metrics.revenueMonth, 0),
      partners: hotelHealth.reduce((s, h) => s + h.metrics.partnerCount, 0),
      cloverPartners: hotelHealth.reduce((s, h) => s + h.metrics.cloverPartnerCount, 0),
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
  return { hotels: 0, activeHotels: 0, requestsToday: 0, requestsWeek: 0, foodOrders: 0, revenue: 0, partners: 0, cloverPartners: 0, staff: 0, rooms: 0 };
}

function countByHotel(rows: { hotel_id: string }[]): Record<string, number> {
  const map: Record<string, number> = {};
  rows.forEach(r => { map[r.hotel_id] = (map[r.hotel_id] || 0) + 1; });
  return map;
}
