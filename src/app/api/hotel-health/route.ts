import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: hotels } = await supabase.from('hotels').select('id, slug, name, room_count, is_active');

    if (!hotels) return NextResponse.json({ hotels: [], totals: {} });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const results = await Promise.all(hotels.map(async (hotel) => {
      const [
        { count: requestsToday },
        { count: requestsWeek },
        { count: foodOrders },
        { data: fees },
        { count: staffCount },
        { count: partnerCount },
        { data: cloverPartners },
        { data: lastReq },
      ] = await Promise.all([
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).gte('created_at', todayStart),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).gte('created_at', weekStart),
        supabase.from('requests').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).gte('created_at', todayStart).ilike('type', '%food%'),
        supabase.from('attenda_fees').select('order_total, fee_amount').eq('hotel_id', hotel.id),
        supabase.from('staff_accounts').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id),
        supabase.from('partners').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('is_active', true),
        supabase.from('partners').select('id, name, clover_enabled').eq('hotel_id', hotel.id).eq('clover_enabled', true).eq('is_active', true),
        supabase.from('requests').select('created_at').eq('hotel_id', hotel.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const revenueMonth = (fees || []).reduce((s: number, f: { fee_amount?: number }) => s + (Number(f.fee_amount) || 0), 0);
      const revenueLifetime = revenueMonth; // TODO: add date filter when fees have created_at

      return {
        id: hotel.id,
        slug: hotel.slug,
        name: hotel.name,
        roomCount: hotel.room_count || 0,
        isActive: hotel.is_active !== false,
        metrics: {
          requestsToday: requestsToday || 0,
          requestsWeek: requestsWeek || 0,
          foodOrdersToday: foodOrders || 0,
          revenueMonth,
          revenueLifetime,
          staffCount: staffCount || 0,
          partnerCount: partnerCount || 0,
          cloverPartnerCount: cloverPartners?.length || 0,
          cloverPartners: cloverPartners || [],
          lastActivity: lastReq?.[0]?.created_at || null,
        },
      };
    }));

    const totals = {
      hotels: hotels.length,
      activeHotels: hotels.filter(h => h.is_active !== false).length,
      requestsToday: results.reduce((s, r) => s + r.metrics.requestsToday, 0),
      requestsWeek: results.reduce((s, r) => s + r.metrics.requestsWeek, 0),
      foodOrders: results.reduce((s, r) => s + r.metrics.foodOrdersToday, 0),
      revenue: results.reduce((s, r) => s + r.metrics.revenueMonth, 0),
      partners: results.reduce((s, r) => s + r.metrics.partnerCount, 0),
      cloverPartners: results.reduce((s, r) => s + r.metrics.cloverPartnerCount, 0),
      staff: results.reduce((s, r) => s + r.metrics.staffCount, 0),
      rooms: results.reduce((s, r) => s + r.roomCount, 0),
    };

    return NextResponse.json({ hotels: results, totals });
  } catch (e) {
    console.error('Health API error:', e);
    return NextResponse.json({ error: 'Failed to load health data' }, { status: 500 });
  }
}
