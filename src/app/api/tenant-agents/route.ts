import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getCaller } from '@/lib/supabase-admin';

/**
 * CRUD for tenant sub-agents.
 * GET  — list all agents for a hotel
 * POST — update an agent (toggle, config, etc)
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await getCaller(req);
    if (!caller) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const hotelId = caller.hotelId || new URL(req.url).searchParams.get('hotel_id');
    if (!hotelId) return NextResponse.json({ ok: false, error: 'No hotel' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tenant_agents')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('agent_type');

    if (error) throw error;
    return NextResponse.json({ ok: true, agents: data || [] });
  } catch (e) {
    console.error('List agents error:', e);
    return NextResponse.json({ ok: false, error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCaller(req);
    if (!caller) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { agent_id, is_active, name, system_prompt, first_message, voice_id, tools_enabled } = body;

    if (!agent_id) return NextResponse.json({ ok: false, error: 'agent_id required' }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: agent } = await supabase
      .from('tenant_agents')
      .select('hotel_id')
      .eq('id', agent_id)
      .maybeSingle();

    if (!agent) return NextResponse.json({ ok: false, error: 'Agent not found' }, { status: 404 });
    if (agent.hotel_id !== caller.hotelId && !caller.isSuper) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (is_active !== undefined) updates.is_active = is_active;
    if (name !== undefined) updates.name = name;
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;
    if (first_message !== undefined) updates.first_message = first_message;
    if (voice_id !== undefined) updates.voice_id = voice_id;
    if (tools_enabled !== undefined) updates.tools_enabled = tools_enabled;

    const { data, error } = await supabase
      .from('tenant_agents')
      .update(updates)
      .eq('id', agent_id)
      .select()
      .single();

    if (error) throw error;

    // If toggling, also update the ElevenLabs agent first_message + system_prompt if provided
    if (is_active !== undefined && data?.elevenlabs_agent_id) {
      const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
      if (elevenlabsKey) {
        const configUpdate: Record<string, unknown> = {};
        if (system_prompt !== undefined) configUpdate.system_prompt = system_prompt;
        if (first_message !== undefined) configUpdate.first_message = first_message;

        if (Object.keys(configUpdate).length > 0) {
          try {
            await fetch(`https://api.elevenlabs.io/v1/convai/agents/${data.elevenlabs_agent_id}`, {
              method: 'PATCH',
              headers: { 'xi-api-key': elevenlabsKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_config: { agent: configUpdate } }),
            });
          } catch (e) {
            console.error('ElevenLabs sync failed:', e);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, agent: data });
  } catch (e) {
    console.error('Update agent error:', e);
    return NextResponse.json({ ok: false, error: 'Failed' }, { status: 500 });
  }
}