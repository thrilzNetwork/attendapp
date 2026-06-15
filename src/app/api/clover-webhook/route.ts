import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    // Webhook secret check — Clover sends this header.
    const webhookSecret = req.headers.get('x-clover-webhook-secret');
    const expectedSecret = process.env.CLOVER_WEBHOOK_SECRET;
    if (!expectedSecret) {
      // Unconfigured secret must not mean "accept anyone" in production.
      if (process.env.NODE_ENV === 'production') {
        console.error('Clover webhook secret not configured; rejecting request');
        return NextResponse.json({ ok: false, error: 'Webhook not configured' }, { status: 503 });
      }
    } else if (webhookSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { event, data } = body as { event?: string; data?: unknown };

    if (event === 'order.updated') {
      const { id, state } = (data || {}) as { id?: string; state?: string };
      if (!id || !state) return NextResponse.json({ ok: true });
      const newStatus = state === 'locked' || state === 'paid' ? 'completed' : 'in-progress';

      const { error: updErr } = await supabaseAdmin
        .from('requests')
        .update({ status: newStatus })
        .filter('details', 'ilike', `%Clover #${id}%`);
      if (updErr) {
        console.error('Clover webhook status update failed:', updErr.message);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Clover webhook error:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
