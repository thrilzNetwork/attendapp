import { NextRequest, NextResponse } from 'next/server';

const CLOVER_CLIENT_ID = process.env.NEXT_PUBLIC_CLOVER_CLIENT_ID;
const CLOVER_CLIENT_SECRET = process.env.CLOVER_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/clover-oauth`
  : 'https://attenda-one.vercel.app/api/clover-oauth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // partner_id:hotel_id

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
      return NextResponse.redirect(new URL(`/staff?error=clover_token&msg=${encodeURIComponent(err)}`, req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, merchant_id } = tokenData;

    // Redirect back to staff dashboard with tokens in hash
    const params = new URLSearchParams({
      clover_merchant_id: merchant_id,
      clover_access_token: access_token,
      clover_refresh_token: refresh_token || '',
      partner_id: state || '',
    });

    return NextResponse.redirect(new URL(`/staff?tab=partners&${params.toString()}`, req.url));
  } catch (e) {
    console.error('Clover OAuth error:', e);
    return NextResponse.redirect(new URL(`/staff?error=clover_oauth_failed`, req.url));
  }
}
