import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';
import { getCaller } from '@/lib/supabase-admin';

const SUPABASE_URL = 'https://bdmmstatrsenidlgjock.supabase.co';
const BUCKET = 'kb-documents';

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not configured');
  return createClient(SUPABASE_URL, key);
}

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (!caller.isSuper) {
      const adminClient = getServiceClient();
      const { data: account } = await adminClient
        .from('staff_accounts')
        .select('role')
        .ilike('email', caller.email || '')
        .limit(1)
        .maybeSingle();
      if (account?.role !== 'admin' && account?.role !== 'manager') {
        return NextResponse.json({ ok: false, error: 'Admin or manager required.' }, { status: 403 });
      }
    }

    const { base64, filename, hotelId } = await req.json() as {
      base64: string;
      filename: string;
      hotelId: string;
    };

    if (!base64 || !filename || !hotelId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
    }

    const match = base64.match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ ok: false, error: 'Invalid base64 data.' }, { status: 400 });
    }
    const mimeType = match[1];
    if (mimeType !== 'application/pdf') {
      return NextResponse.json({ ok: false, error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    const buffer = Buffer.from(match[2], 'base64');
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${hotelId}/${Date.now()}-${safeName}`;

    const db = getServiceClient();
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrl, filename: safeName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
