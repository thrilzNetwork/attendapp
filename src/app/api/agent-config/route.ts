import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

/**
 * Update agent config for a specific hotel (tenant-scoped).
 * Only admin/superadmin can modify.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hotel_id, elevenlabs_agent_id, is_active, first_message, system_prompt, voice_id, tools_enabled, max_duration_seconds, is_premium } = body;

    if (!hotel_id) {
      return NextResponse.json({ ok: false, error: 'hotel_id required' }, { status: 400 });
    }

    // Verify session and check admin access
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Verify caller has access to this hotel
    if (caller.hotelId !== hotel_id && !caller.isSuper) {
      return NextResponse.json({ ok: false, error: 'Forbidden — not your property' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (elevenlabs_agent_id !== undefined) updates.elevenlabs_agent_id = elevenlabs_agent_id;
    if (is_active !== undefined) updates.is_active = is_active;
    if (first_message !== undefined) updates.first_message = first_message;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (voice_id !== undefined) updates.voice_id = voice_id;
    if (tools_enabled !== undefined) updates.tools_enabled = tools_enabled;
    if (max_duration_seconds !== undefined) updates.max_duration_seconds = max_duration_seconds;
    if (is_premium !== undefined) updates.is_premium = is_premium;

    const { data, error } = await supabase
      .from('agent_configs')
      .update(updates)
      .eq('hotel_id', hotel_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error('Agent config save error:', e);
    return NextResponse.json({ ok: false, error: 'Failed to save config' }, { status: 500 });
  }
}