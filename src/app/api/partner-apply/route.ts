import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const { name, contact, phone, email, hotel } = body;

    if (!name || !contact || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase.from('partner_applications').insert({
      restaurant_name: name,
      contact_name: contact,
      contact_phone: phone,
      contact_email: email,
      hotel_slug: hotel || '',
      status: 'pending',
    });

    if (error) {
      console.error('Partner application insert error:', error);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Partner application error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}