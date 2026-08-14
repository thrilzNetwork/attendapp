import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * ElevenLabs server tool: Schedule a demo
 * Called by the agent when a visitor wants to schedule a demo.
 * Saves the lead to demo_leads table.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, property_name, notes, phone } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.from('demo_leads').insert({
      name: name || 'Unknown',
      email,
      property_name: property_name || null,
      phone: phone || null,
      source: 'agent_chat',
      notes: notes || 'Captured via ElevenLabs agent chat',
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ 
      ok: true, 
      lead_id: data.id,
      message: `Demo request saved for ${name || email}` 
    });
  } catch (e) {
    console.error('Tool error:', e);
    return NextResponse.json({ error: 'Failed to save demo request' }, { status: 500 });
  }
}