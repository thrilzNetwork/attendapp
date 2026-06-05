import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { action, data } = await req.json();

    if (action === 'create_hotel') {
      const { data: hotel, error } = await supabaseAdmin.from('hotels').insert({
        slug: data.slug,
        name: data.name,
        website_url: data.websiteUrl || null,
        admin_phone: data.adminPhone || null,
        room_count: data.roomCount || 0,
        address: data.address || null,
        notification_email: data.adminEmail || data.notificationEmail || null,
        google_review_url: data.googleReviewUrl || null,
        tripadvisor_url: data.tripadvisorUrl || null,
        yelp_url: data.yelpUrl || null,
        property_type: data.propertyType || 'Hotel',
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, hotel });
    }

    if (action === 'list_hotels') {
      const { data: hotels, error } = await supabaseAdmin.from('hotels').select('*').order('created_at');
      if (error) throw error;
      return NextResponse.json({ ok: true, hotels: hotels || [] });
    }

    if (action === 'create_staff') {
      const { data: staff, error } = await supabaseAdmin.from('staff_accounts').insert({
        hotel_id: data.hotel_id,
        name: data.name,
        role: data.role || 'staff',
        email: data.email || '',
        phone: data.phone || '',
        pin_code: data.pin_code,
        permissions: data.permissions || ['orders', 'messages', 'shuttle'],
        vendor_type: data.vendor_type || null,
        department: data.department || null,
        hire_date: data.hire_date || null,
        pto_used: data.pto_used || 0,
        min_hours: data.min_hours || 0,
        employment_type: data.employment_type || null,
        active: true,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, staff });
    }

    if (action === 'update_staff') {
      const { error } = await supabaseAdmin.from('staff_accounts').update(data.updates).eq('id', data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_staff_permissions') {
      const { error } = await supabaseAdmin.from('staff_accounts').update({ permissions: data.permissions }).eq('id', data.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_hotel') {
      const cfg = data.config;
      const { error } = await supabaseAdmin.from('hotels').upsert({
        slug: cfg.slug || 'miami-airport',
        name: cfg.name,
        address: cfg.address,
        wifi_name: cfg.wifiName,
        wifi_password: cfg.wifiPassword,
        welcome_letter: cfg.welcomeLetter,
        manager_name: cfg.managerName,
        manager_phone: cfg.managerPhone,
        front_desk_phone: cfg.frontDeskPhone,
        notification_email: cfg.notificationEmail,
        admin_phone: cfg.adminPhone,
        website_url: cfg.websiteUrl,
        room_count: cfg.roomCount,
        google_review_url: cfg.googleReviewUrl,
        tripadvisor_url: cfg.tripadvisorUrl,
        yelp_url: cfg.yelpUrl,
        property_type: cfg.propertyType,
        brand: cfg.brand,
        shuttle_provider: cfg.shuttleProvider,
        shuttle_phone: cfg.shuttlePhone,
        shuttle_days: cfg.shuttleDays,
        shuttle_capacity: cfg.shuttleCapacity,
        shuttle_pickup_location: cfg.shuttlePickupLocation,
        shuttle_notes: cfg.shuttleNotes,
        week_starts_on: cfg.weekStartsOn,
        payment_type: cfg.paymentType,
        last_payment: cfg.lastPayment,
        amenities: cfg.amenities,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}