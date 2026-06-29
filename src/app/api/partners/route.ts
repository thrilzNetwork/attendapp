import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller } from '@/lib/supabase-admin';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';


function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createClient(SUPABASE_URL, key);
}

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const body = await req.json();
    const { action, data } = body as { action: string; data: Record<string, unknown> };

    const db = getServiceClient();

    // Public read-only actions — no auth required (guest-facing)
    if (action === 'get_partners') {
      const { data: rows, error } = await db
        .from('partners')
        .select('id, hotel_id, name, category, description, image_url, phone, address, hours, distance, rating, has_ordering, is_active, delivery_providers')
        .eq('hotel_id', data.hotel_id)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, data: rows });
    }

    if (action === 'get_menu_items') {
      const { data: rows, error } = await db
        .from('partner_menu_items')
        .select('id, partner_id, name, description, price, image_url, category, is_active, sort_order')
        .eq('partner_id', data.partner_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, data: rows });
    }

    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    switch (action) {
      case 'create_partner': {
        const { data: row, error } = await db
          .from('partners')
          .insert({ ...data, is_active: true })
          .select()
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data: row });
      }

      case 'update_partner': {
        const { id, updates } = data as { id: string; updates: Record<string, unknown> };
        const { error } = await db.from('partners').update(updates).eq('id', id);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'delete_partner': {
        const { error } = await db
          .from('partners')
          .update({ is_active: false })
          .eq('id', data.id);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'create_menu_item': {
        const { data: row, error } = await db
          .from('partner_menu_items')
          .insert({ ...data, is_active: true })
          .select()
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data: row });
      }

      case 'delete_menu_item': {
        const { error } = await db
          .from('partner_menu_items')
          .update({ is_active: false })
          .eq('id', data.id);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'update_menu_item': {
        const { id: itemId, ...patch } = data as { id: string; [k: string]: unknown };
        const { error } = await db.from('partner_menu_items').update(patch).eq('id', itemId);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      case 'upload_image': {
        const { base64, filename, folder } = data as { base64: string; filename: string; folder: string };
        const match = (base64 as string).match(/^data:(.+?);base64,(.+)$/);
        if (!match) return NextResponse.json({ ok: false, error: 'Invalid image data' }, { status: 400 });
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const ext = (filename as string).split('.').pop() || 'jpg';
        const path = `${folder || 'misc'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await db.storage.from('partner-images').upload(path, buffer, {
          contentType: mimeType, upsert: false,
        });
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        const { data: { publicUrl } } = db.storage.from('partner-images').getPublicUrl(path);
        return NextResponse.json({ ok: true, url: publicUrl });
      }

      case 'list_applications': {
        // Pending vendor self-onboarding applications for this hotel
        const { data: hotel } = await db.from('hotels').select('slug').eq('id', data.hotel_id).maybeSingle();
        const slug = hotel?.slug;
        const { data: rows, error } = await db
          .from('partner_applications')
          .select('*')
          .eq('status', 'pending')
          .or(slug ? `hotel_slug.eq.${slug},hotel_slug.eq.` : 'hotel_slug.eq.')
          .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data: rows });
      }

      case 'approve_application': {
        const { applicationId, hotel_id } = data as { applicationId: string; hotel_id: string };
        const { data: app } = await db.from('partner_applications').select('*').eq('id', applicationId).maybeSingle();
        if (!app) return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });

        // 1. Create the partner (active) under this hotel
        const { data: partner, error: pErr } = await db.from('partners').insert({
          hotel_id,
          name: app.restaurant_name,
          category: 'restaurant',
          phone: app.contact_phone || '',
          email: app.contact_email || '',
          description: app.message || '',
          has_ordering: true,
          is_active: true,
        }).select('id').single();
        if (pErr || !partner) return NextResponse.json({ ok: false, error: pErr?.message || 'Partner create failed' }, { status: 500 });

        // 2. Create the vendor login account (role=vendor) with a setup token
        const setupToken = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
        const setupExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        await db.from('staff_accounts').insert({
          hotel_id,
          name: `${app.restaurant_name} (Vendor)`,
          role: 'vendor',
          email: app.contact_email || '',
          partner_id: partner.id,
          permissions: [],
          pin_code: pin,
          setup_token: setupToken,
          setup_token_expires_at: setupExpires,
          active: true,
        });

        // 3. Mark the application approved
        await db.from('partner_applications').update({ status: 'approved' }).eq('id', applicationId);

        return NextResponse.json({ ok: true, partnerId: partner.id, vendorEmail: app.contact_email, setupToken });
      }

      case 'reject_application': {
        const { error } = await db.from('partner_applications').update({ status: 'rejected' }).eq('id', data.applicationId);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('partners route error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
