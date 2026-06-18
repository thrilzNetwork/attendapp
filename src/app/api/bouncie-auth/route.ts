import { NextRequest, NextResponse } from 'next/server';
import { getBouncieAuthUrl } from '@/lib/bouncie';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get('hotelId');
    if (!hotelId) {
      return NextResponse.json({ error: 'Missing hotelId' }, { status: 400 });
    }

    const url = getBouncieAuthUrl(hotelId);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error('Bouncie auth error:', e);
    return NextResponse.json({ error: 'Bouncie auth config missing' }, { status: 500 });
  }
}
