import { NextRequest, NextResponse } from 'next/server';
import { exchangeBouncieCode } from '@/lib/bouncie';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');

  let hotelId = '';
  try {
    const parsed = stateRaw ? JSON.parse(stateRaw) : {};
    hotelId = parsed.hotelId || '';
  } catch {
    hotelId = stateRaw || '';
  }

  if (!code || !hotelId) {
    return NextResponse.redirect(new URL(`/staff?tab=shuttle&error=bouncie_missing_params`, req.url));
  }

  try {
    const tokens = await exchangeBouncieCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const db = getSupabaseAdmin();
    await db.from('bouncie_connections').upsert(
      {
        hotel_id: hotelId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'hotel_id' }
    );

    // Immediately discover vehicles for this hotel
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/bouncie/sync-devices?hotelId=${encodeURIComponent(hotelId)}`, {
      method: 'POST',
    }).catch(() => {});

    return NextResponse.redirect(new URL(`/staff?tab=shuttle&bouncie_connected=1`, req.url));
  } catch (e) {
    console.error('Bouncie callback error:', e);
    return NextResponse.redirect(new URL(`/staff?tab=shuttle&error=bouncie_oauth_failed`, req.url));
  }
}
