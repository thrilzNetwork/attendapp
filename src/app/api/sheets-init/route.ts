import { NextRequest, NextResponse } from 'next/server';
import { initializeShuttleSheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const { sheetUrl } = await req.json();
    if (!sheetUrl) return NextResponse.json({ error: 'No sheet URL provided' }, { status: 400 });

    const result = await initializeShuttleSheet(sheetUrl);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Sheets init error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
