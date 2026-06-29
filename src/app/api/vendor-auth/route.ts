import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifySession } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Vendor authentication. A vendor is a staff_accounts row with role='vendor'
// and a partner_id linking them to their restaurant. They use the same
// setup-token → password flow as staff, but land on /vendor scoped to their partner.
export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const { action, email, password, token } = await req.json();

    if (action === 'setup') {
      // Vendor claims their pre-created account with a setup token + new password
      if (!email || !password || !token) {
        return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }

      // Find the vendor account by setup token
      const { data: vendor } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, hotel_id, partner_id, name, role, email, setup_token_expires_at')
        .eq('setup_token', token)
        .eq('role', 'vendor')
        .maybeSingle();

      if (!vendor) {
        return NextResponse.json({ ok: false, error: 'Invalid or used setup link.' }, { status: 404 });
      }
      if (vendor.setup_token_expires_at && new Date(vendor.setup_token_expires_at) < new Date()) {
        return NextResponse.json({ ok: false, error: 'This setup link has expired. Ask the hotel to resend it.' }, { status: 410 });
      }
      if (vendor.email && vendor.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ ok: false, error: 'Email does not match this invitation.' }, { status: 400 });
      }

      // Create the auth user with hotel_id + partner_id + role in metadata
      const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          hotel_id: vendor.hotel_id,
          partner_id: vendor.partner_id,
          name: vendor.name,
          role: 'vendor',
        },
      });
      if (createErr) throw createErr;

      // Link the auth user, clear the setup token
      await supabaseAdmin.from('staff_accounts').update({
        auth_user_id: authData.user?.id,
        email,
        setup_token: null,
        setup_token_expires_at: null,
      }).eq('id', vendor.id);

      return NextResponse.json({ ok: true, partnerId: vendor.partner_id });
    }

    if (action === 'login') {
      const anonClient = (await import('@supabase/supabase-js')).createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Look up the vendor's partner_id (server-side, never trust client)
      const { data: vendor } = await supabaseAdmin
        .from('staff_accounts')
        .select('hotel_id, partner_id, role')
        .eq('email', email)
        .eq('role', 'vendor')
        .maybeSingle();

      if (!vendor) {
        return NextResponse.json({ ok: false, error: 'No vendor account for this email.' }, { status: 403 });
      }

      // Ensure JWT metadata has the scoping fields
      if (data.user) {
        const md = data.user.user_metadata || {};
        if (md.partner_id !== vendor.partner_id || md.hotel_id !== vendor.hotel_id) {
          await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
            user_metadata: { ...md, hotel_id: vendor.hotel_id, partner_id: vendor.partner_id, role: 'vendor' },
          });
        }
      }

      return NextResponse.json({ ok: true, session: data.session, partnerId: vendor.partner_id });
    }

    if (action === 'whoami') {
      // Resolve the vendor's partner_id from their session token
      const tokenStr = token || req.headers.get('authorization')?.replace('Bearer ', '');
      if (!tokenStr) return NextResponse.json({ ok: true, vendor: null });
      const user = await verifySession(tokenStr);
      if (!user) return NextResponse.json({ ok: true, vendor: null });

      const { data: vendor } = await supabaseAdmin
        .from('staff_accounts')
        .select('hotel_id, partner_id, name, role')
        .eq('auth_user_id', user.id)
        .eq('role', 'vendor')
        .maybeSingle();

      return NextResponse.json({ ok: true, vendor });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
