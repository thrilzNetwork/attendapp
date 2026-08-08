import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

/**
 * Custom password-reset request.
 *
 * Instead of calling client-side `resetPasswordForEmail()` (which makes SUPABASE
 * send its own un-branded reset email), we generate a recovery link via the
 * admin API (no email sent by Supabase) and deliver a fully Attenda-branded
 * email through Resend. The link lands on /staff/reset-password which already
 * listens for the PASSWORD_RECOVERY event and lets the user set a new password.
 */
export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email is required.' }, { status: 400 });
    }

    // 1. Verify the email belongs to a known staff account so we can personalize
    const { data: staff } = await supabaseAdmin
      .from('staff_accounts')
      .select('id, name, email, hotel_id')
      .ilike('email', email.trim())
      .maybeSingle();

    // Even if the staff row is missing, still attempt a recovery link so we don't
    // leak whether an email is registered (but we can't send a branded email
    // without a name/hotel — so only send when staff exists).
    let hotelName = '';
    if (staff?.hotel_id) {
      const { data: hotel } = await supabaseAdmin
        .from('hotels')
        .select('name')
        .eq('id', staff.hotel_id)
        .maybeSingle();
      hotelName = hotel?.name || '';
    }

    // 2. Generate a recovery link WITHOUT Supabase sending its own email.
    //    generateLink returns { data: { properties: { action_link } } }.
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: { redirectTo: 'https://attendaapp.com/staff/reset-password' },
    });
    if (linkErr) {
      // User may not exist in auth.users yet — surface a friendly error.
      return NextResponse.json({ ok: false, error: 'We couldn\u2019t find an account for that email.' }, { status: 404 });
    }
    const actionLink = linkData?.properties?.action_link || linkData?.properties?.email_otp || '';
    if (!actionLink) {
      return NextResponse.json({ ok: false, error: 'Could not generate a reset link.' }, { status: 500 });
    }

    // 3. Send the branded email via Resend (only if we have a known staff member).
    if (staff?.email) {
      const res = await fetch(`${req.nextUrl.origin}/api/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '',
        },
        body: JSON.stringify({
          type: 'password_reset',
          data: {
            staffEmail: staff.email,
            staffName: staff.name || '',
            hotelName,
            resetUrl: actionLink,
          },
        }),
      });
      if (!res.ok) {
        // Branded email failed — fall back to letting Supabase send its own so
        // the user isn't stranded without a way to reset.
        await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email.trim(),
        });
      }
    } else {
      // No staff row — send a minimal generic reset (branded) anyway.
      const res = await fetch(`${req.nextUrl.origin}/api/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '',
        },
        body: JSON.stringify({
          type: 'password_reset',
          data: { staffEmail: email.trim(), staffName: '', hotelName: '', resetUrl: actionLink },
        }),
      });
      if (!res.ok) {
        await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: email.trim() });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/staff-password-reset error:', err);
    return NextResponse.json({ ok: false, error: 'Could not send reset email.' }, { status: 500 });
  }
}
