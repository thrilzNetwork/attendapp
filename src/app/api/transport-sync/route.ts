import { NextRequest, NextResponse } from 'next/server';
import { appendTransportRequest } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  const { sheetUrl, ...request } = await req.json();
  if (!sheetUrl) return NextResponse.json({ ok: true, warning: 'No sheet URL configured' });

  try {
    await appendTransportRequest(sheetUrl, request);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Transport sync failed:', e);
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
