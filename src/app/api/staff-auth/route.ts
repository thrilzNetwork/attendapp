import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, verifySession, isSuperAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Require shared API key
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Origin check
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    if (!isAllowedOrigin(origin, referer)) {
      return originBlocked();
    }

    const { action, email, password, name, hotelSlug, token } = await req.json();

    if (action === 'setup') {
      // First-time staff setup: an admin already invited this person, which created
      // their staff_accounts row. Create their auth user here (server-side, confirmed)
      // and update that existing row — the client-side supabase.auth.signUp() path this
      // replaced created an UNCONFIRMED user whenever the project requires email
      // confirmation, permanently locking staff out of login until they confirmed an
      // email they often never received.
      if (!email || !password || !name || !hotelSlug) {
        return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }

      // Look up hotel by slug to get the hotel_id
      const { data: hotel } = await supabaseAdmin
        .from('hotels')
        .select('id')
        .eq('slug', hotelSlug)
        .single();

      if (!hotel) {
        return NextResponse.json({ ok: false, error: 'Hotel not found for that slug.' }, { status: 404 });
      }

      // The invited staff_accounts row must already exist
      const { data: existingStaff } = await supabaseAdmin
        .from('staff_accounts')
        .select('id, role')
        .eq('hotel_id', hotel.id)
        .ilike('email', email)
        .maybeSingle();

      if (!existingStaff) {
        return NextResponse.json({ ok: false, error: 'Staff account not found for this email. Contact your admin.' }, { status: 404 });
      }

      // Create the auth user pre-confirmed — skips the email confirmation step entirely
      const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          hotel_id: hotel.id,
          name,
          role: existingStaff.role || 'staff',
        },
      });
      if (createErr) {
        if (createErr.message?.toLowerCase().includes('already registered') || createErr.message?.toLowerCase().includes('already exists')) {
          return NextResponse.json({ ok: false, error: 'An account already exists for this email. Use "Forgot your password?" to sign in.' }, { status: 409 });
        }
        throw createErr;
      }

      // Update the existing invited row instead of inserting a duplicate
      const { error: staffErr } = await supabaseAdmin
        .from('staff_accounts')
        .update({ name, active: true, setup_token: null, setup_token_expires_at: null })
        .eq('id', existingStaff.id);
      if (staffErr) throw staffErr;

      return NextResponse.json({ ok: true, user: authData.user });
    }

    if (action === 'setup_superadmin') {
      // Superadmin signup — no hotel_id in metadata
      const { data, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'superadmin' },
      });
      if (signUpErr) throw signUpErr;

      return NextResponse.json({ ok: true, user: data.user });
    }

    if (action === 'login') {
      // Email + password login — attach hotel_id to JWT on first successful login
      const anonClient = (await import('@supabase/supabase-js')).createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      // Ensure user_metadata has hotel_id
      if (data.user && !data.user.user_metadata?.hotel_id) {
        // Look up the staff record to find hotel_id
        const { data: staff } = await supabaseAdmin
          .from('staff_accounts')
          .select('hotel_id')
          .eq('email', email)
          .maybeSingle();

        if (staff?.hotel_id) {
          await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
            user_metadata: { ...data.user.user_metadata, hotel_id: staff.hotel_id },
          });
        }
      }

      return NextResponse.json({ ok: true, user: data.user, session: data.session });
    }

    if (action === 'check_session') {
      // Verify a session token
      const tokenStr = token || req.headers.get('authorization')?.replace('Bearer ', '');
      if (!tokenStr) {
        return NextResponse.json({ ok: true, user: null });
      }
      const user = await verifySession(tokenStr);
      return NextResponse.json({ ok: true, user });
    }

    if (action === 'sign_out') {
      const anonClient = (await import('@supabase/supabase-js')).createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await anonClient.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    if (action === 'authorize_superadmin') {
      // Verify that the session token belongs to the registered superadmin
      const tokenStr = token || req.headers.get('authorization')?.replace('Bearer ', '');
      if (!tokenStr) return NextResponse.json({ ok: false }, { status: 401 });

      const user = await verifySession(tokenStr);
      if (!user) return NextResponse.json({ ok: false }, { status: 401 });

      const isAdmin = await isSuperAdmin(user.id);
      if (!isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

      return NextResponse.json({ ok: true, user });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}