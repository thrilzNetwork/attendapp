import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-uber-signature') ?? '';
  const secret = process.env.UBER_DIRECT_WEBHOOK_SECRET ?? '';

  if (secret) {
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed))) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const uberDeliveryId = body?.meta?.resource_id ?? body?.data?.id;
  const newStatus: string = body?.data?.status ?? body?.status ?? '';

  if (uberDeliveryId && newStatus) {
    const update: Record<string, string> = { uber_status: newStatus };
    if (newStatus === 'delivered') update.vendor_status = 'ready';

    await supabaseAdmin.from('requests')
      .update(update)
      .eq('uber_delivery_id', uberDeliveryId);
  }

  return NextResponse.json({ ok: true });
}
