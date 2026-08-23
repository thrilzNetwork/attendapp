// ══════════════════════════════════════════════════════════════
//  Schedule Demo API — Collects leads from Super Agent
//  POST /api/schedule-demo
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

    // Notify a human. A lead that only lands in a table is a lead nobody answers,
    // so this runs on every submit — but never blocks the response: the lead is
    // already safely stored, and an email outage must not read as a failed form.
    void notifyNewLead({ name, email, property_name, phone, notes, source }).catch(e =>
      console.error('schedule-demo: lead notification failed', e),
    );

    return NextResponse.json({
      success: true,
      message: `Thanks ${name}! We've received your request. The Attenda team will reach out to ${email} within 4 business hours to schedule your demo. No slide deck, no commitment — just a 15-minute call showing Attenda on your property.`,
      lead,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

const ALERT_TO = process.env.LEAD_ALERT_EMAIL || 'thrilznetwork@gmail.com';

/** Where a human actually reads mail. noreply@ has no inbox, so replies to it vanish. */
const REPLY_TO = process.env.CONTACT_REPLY_TO || 'thrilznetwork@gmail.com';

async function notifyNewLead(lead: {
  name: string;
  email: string;
  property_name?: string;
  phone?: string;
  notes?: string;
  source?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Nothing configured — stay silent rather than throw.

  const resend = new Resend(apiKey);
  const row = (label: string, value?: string) =>
    value ? `<p style="font-size:13px;color:#555;margin:0 0 4px"><strong>${label}:</strong> ${value}</p>` : '';

  await resend.emails.send({
    from: 'Attenda <noreply@attendaapp.com>',
    to: ALERT_TO,
    // Lets you answer the prospect straight from the alert.
    replyTo: lead.email,
    subject: `New demo request: ${lead.property_name || lead.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
        <div style="background:#158A7C;border-radius:12px;padding:24px;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:20px;font-weight:800">New demo request</h1>
        </div>
        <div style="background:#f9fafb;border-radius:10px;padding:20px">
          ${row('Name', lead.name)}
          ${row('Email', lead.email)}
          ${row('Phone', lead.phone)}
          ${row('Property', lead.property_name)}
          ${row('Source', lead.source)}
        </div>
        ${lead.notes ? `<div style="background:#f9fafb;border-radius:10px;padding:20px;margin-top:16px;border-left:4px solid #158A7C"><p style="font-size:14px;color:#333;margin:0;line-height:1.6">${lead.notes}</p></div>` : ''}
      </div>
    `,
  });

  // Acknowledge to the prospect so silence never reads as being ignored.
  await resend.emails.send({
    from: 'Attenda <noreply@attendaapp.com>',
    to: lead.email,
    replyTo: REPLY_TO,
    subject: 'We got your request — Attenda',
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
        <div style="background:#158A7C;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Request received</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">We'll be in touch within one business day</p>
        </div>
        <p style="font-size:15px;color:#111;margin-bottom:8px">Hi ${lead.name},</p>
        <p style="font-size:14px;color:#444;line-height:1.6">
          Thanks for reaching out${lead.property_name ? ` about <strong>${lead.property_name}</strong>` : ''}.
          We'll follow up shortly to set up a short walkthrough on your property.
        </p>
        <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px">Just reply to this email if you need anything sooner.</p>
      </div>
    `,
  });
}