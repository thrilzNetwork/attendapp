import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CLOVER_CLIENT_ID = process.env.NEXT_PUBLIC_CLOVER_CLIENT_ID;
const CLOVER_CLIENT_SECRET = process.env.CLOVER_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/clover-oauth`
  : 'https://attenda-one.vercel.app/api/clover-oauth';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bdmmstatrsenidlgjock.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Phase 1: Redirect to Clover authorization
  if (!code) {
    const partnerId = searchParams.get('partner');
    if (!partnerId) return NextResponse.json({ error: 'Missing partner ID' }, { status: 400 });

    const authUrl = `https://www.clover.com/oauth/authorize?client_id=${CLOVER_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${partnerId}`;
    return NextResponse.redirect(authUrl);
  }

  // Phase 2: Exchange code for tokens
  if (!CLOVER_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/staff?error=missing_clover_secret', req.url));
  }

  try {
    const tokenRes = await fetch('https://api.clover.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLOVER_CLIENT_ID,
        client_secret: CLOVER_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Clover token exchange failed:', err);
      return NextResponse.redirect(new URL(`/staff?error=clover_token`, req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, merchant_id } = tokenData;
    const partnerId = state;

    // Save tokens directly to DB — never expose in URL
    if (partnerId && partnerId !== 'new') {
      const db = getSupabaseAdmin();
      const { error } = await db.from('partners').update({
        clover_merchant_id: merchant_id,
        clover_access_token: access_token,
        clover_refresh_token: refresh_token || null,
        clover_enabled: true,
      }).eq('id', partnerId);

      if (error) {
        console.error('Failed to save Clover tokens:', error.message);
        return NextResponse.redirect(new URL(`/staff?tab=partners&error=clover_save_failed`, req.url));
      }
    }

    return NextResponse.redirect(
      new URL(`/staff?tab=partners&clover_connected=1&partner_id=${partnerId || ''}`, req.url)
    );
  } catch (e) {
    console.error('Clover OAuth error:', e);
    return NextResponse.redirect(new URL(`/staff?error=clover_oauth_failed`, req.url));
  }
}
