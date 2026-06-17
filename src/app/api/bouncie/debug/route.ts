import { NextRequest, NextResponse } from 'next/server';
import { getActiveBouncieToken } from '@/lib/bouncie';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });

  try {
    const accessToken = await getActiveBouncieToken(hotelId);
    const res = await fetch('https://api.bouncie.dev/v1/vehicles', {
      headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
    });
    const raw = await res.json();
    return NextResponse.json({ ok: true, status: res.status, raw });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
