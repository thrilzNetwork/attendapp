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

    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, data } = body as { action: string; data: Record<string, unknown> };

    const db = getServiceClient();

    switch (action) {
      case 'get_partners': {
        const { data: rows, error } = await db
          .from('partners')
          .select('*')
          .eq('hotel_id', data.hotel_id)
          .eq('is_active', true)
          .order('category')
          .order('name');
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data: rows });
      }

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

      case 'get_menu_items': {
        const { data: rows, error } = await db
          .from('partner_menu_items')
          .select('*')
          .eq('partner_id', data.partner_id)
          .eq('is_active', true);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data: rows });
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

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('partners route error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
