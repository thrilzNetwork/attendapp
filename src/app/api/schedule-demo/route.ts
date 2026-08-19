// ══════════════════════════════════════════════════════════════
//  Schedule Demo API — Collects leads from Super Agent
//  POST /api/schedule-demo
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zhhhyrodqndeyjxveszu.supabase.co';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, property_name, phone, notes, source } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const serviceKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, serviceKey);

    const { data: lead, error } = await supabase
      .from('demo_leads')
      .insert({
        name,
        email,
        property_name: property_name || null,
        phone: phone || null,
        notes: notes || null,
        source: source || 'super_agent',
        status: 'new',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Thanks ${name}! We've received your request. The Attenda team will reach out to ${email} within 4 business hours to schedule your demo. No slide deck, no commitment — just a 15-minute call showing Attenda on your property.`,
      lead,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}