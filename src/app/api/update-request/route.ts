import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id, status, assigned_to } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ ok: false, error: 'id and status required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = { status };
    if (assigned_to !== undefined) update.assigned_to = assigned_to;

    const { error } = await supabase.from('requests').update(update).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[update-request]', e);
    return NextResponse.json({ ok: false, error: 'Failed to update request' }, { status: 500 });
  }
}
