// ══════════════════════════════════════════════════════════════
//  Attenda AI Agent API — Tools for ElevenLabs agents
//  Called by ElevenLabs agent tools (function calling)
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhhhyrodqndeyjxveszu.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

// Validate agent API key
function validateAgentKey(req: NextRequest): boolean {
  const key = req.headers.get('x-agent-api-key');
  return key === process.env.AGENT_API_KEY;
}

// ═══ GET /api/agent/hotel-info?hotel_id=xxx ══════════════════
export async function GET(req: NextRequest) {
  if (!validateAgentKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotel_id');
  const action = searchParams.get('action');

  if (!hotelId) {
    return NextResponse.json({ error: 'hotel_id required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'hotel_info': {
        const { data: hotel } = await getSupabaseAdmin()
          .from('hotels')
          .select('name, address, phone, timezone, amenities, breakfast_hours, checkout_time')
          .eq('id', hotelId)
          .single();

        const { data: config } = await getSupabaseAdmin()
          .from('agent_configs')
          .select('knowledge_base')
          .eq('hotel_id', hotelId)
          .single();

        return NextResponse.json({
          hotel: hotel || null,
          knowledge: config?.knowledge_base || {},
        });
      }

      case 'shuttle': {
        const { data: shuttles } = await getSupabaseAdmin()
          .from('shuttle_requests')
          .select('*')
          .eq('hotel_id', hotelId)
          .gte('created_at', new Date().toISOString().slice(0, 10))
          .order('created_at', { ascending: false })
          .limit(20);

        return NextResponse.json({ shuttles: shuttles || [] });
      }

      case 'recent_calls': {
        const { data: calls } = await getSupabaseAdmin()
          .from('agent_calls')
          .select('*')
          .eq('hotel_id', hotelId)
          .order('started_at', { ascending: false })
          .limit(10);

        return NextResponse.json({ calls: calls || [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ═══ POST /api/agent — Create request, log call, escalate ════
export async function POST(req: NextRequest) {
  if (!validateAgentKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, hotel_id, ...data } = body;

    if (!hotel_id) {
      return NextResponse.json({ error: 'hotel_id required' }, { status: 400 });
    }

    switch (action) {
      // ─── Create a request ───────────────────────────────
      case 'create_request': {
        const { data: request, error } = await getSupabaseAdmin()
          .from('agent_requests')
          .insert({
            hotel_id,
            call_id: data.call_id || null,
            request_type: data.request_type || 'other',
            room_number: data.room_number || null,
            guest_name: data.guest_name || null,
            description: data.description,
            priority: data.priority || 'normal',
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Also create in the main requests table for staff visibility
        await getSupabaseAdmin().from('requests').insert({
          hotel_id,
          guest_name: data.guest_name || 'Guest',
          room_number: data.room_number || '',
          request_type: data.request_type || 'other',
          description: `[AI Agent] ${data.description}`,
          status: 'open',
          source: 'ai_agent',
        });

        return NextResponse.json({ success: true, request });
      }

      // ─── Log a call ────────────────────────────────────
      case 'log_call': {
        const { data: call, error } = await getSupabaseAdmin()
          .from('agent_calls')
          .insert({
            hotel_id,
            caller_name: data.caller_name || null,
            caller_room: data.caller_room || null,
            caller_phone: data.caller_phone || null,
            conversation_id: data.conversation_id || null,
            status: data.status || 'active',
            transcript: data.transcript || null,
            duration_seconds: data.duration_seconds || 0,
            request_created: data.request_created || false,
            request_id: data.request_id || null,
            escalated: data.escalated || false,
            escalated_to: data.escalated_to || null,
            started_at: data.started_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, call });
      }

      // ─── Update call status ────────────────────────────
      case 'update_call': {
        const { error } = await getSupabaseAdmin()
          .from('agent_calls')
          .update({
            status: data.status,
            transcript: data.transcript,
            duration_seconds: data.duration_seconds,
            ended_at: data.status === 'completed' ? new Date().toISOString() : undefined,
            escalated: data.escalated || false,
            escalated_to: data.escalated_to || null,
          })
          .eq('id', data.call_id);

        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // ─── Escalate to staff ─────────────────────────────
      case 'escalate': {
        // Create an urgent request
        const { data: request, error } = await getSupabaseAdmin()
          .from('agent_requests')
          .insert({
            hotel_id,
            call_id: data.call_id || null,
            request_type: 'other',
            room_number: data.room_number || null,
            guest_name: data.guest_name || null,
            description: `[ESCALATED] ${data.reason || 'Guest needs staff assistance'}`,
            priority: 'urgent',
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Mark call as escalated
        await getSupabaseAdmin()
          .from('agent_calls')
          .update({ escalated: true, escalated_to: data.escalated_to || 'front_desk' })
          .eq('id', data.call_id);

        return NextResponse.json({ success: true, request, message: 'Staff has been notified' });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}