/**
 * Notification emails for corporate intake (talent pool + partner applications).
 * Uses Resend REST directly (no SDK import) and fails silently when RESEND_API_KEY
 * isn't configured — a submission must never 500 because email is down.
 */

const ALERT_TO = 'thrilznetwork@gmail.com';

async function send(subject: string, html: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Attenda <noreply@attendaapp.com>',
        to: [ALERT_TO],
        replyTo: replyTo || undefined,
        subject,
        html,
      }),
    });
  } catch {
    // silent — DB row is the source of truth
  }
}

const row = (label: string, value?: string | null) =>
  value ? `<p style="font-size:13px;color:#555;margin:0 0 4px"><strong>${label}:</strong> ${value}</p>` : '';

export function notifyOnboardedCredentials(c: { name: string; email: string; password: string }) {
  return send(
    `Welcome to Attenda, ${c.name} — your login`,
    `<div style="font-family:Arial,sans-serif;max-width:520px">
      <h2 style="color:#158A7C;margin:0 0 12px">Your Attenda login</h2>
      <p style="font-size:14px;color:#333;margin:0 0 12px">Hi ${c.name} — welcome aboard. Sign in at <strong>attendaapp.com/corporate</strong> with:</p>
      <p style="font-size:14px;margin:0 0 4px"><strong>Username:</strong> ${c.email}</p>
      <p style="font-size:14px;margin:0 0 16px"><strong>Password:</strong> ${c.password}</p>
      <p style="font-size:12px;color:#888;margin:0">Keep this email safe — it's your backup copy of your credentials.</p>
    </div>`,
    c.email
  );
}

export function notifyNewTalent(c: {
  full_name: string; email: string; years_experience?: string | null;
  skills?: string[]; superpower?: string | null; story?: string | null;
}) {
  return send(
    `New talent: ${c.full_name}`,
    `<div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
      <div style="background:#158A7C;border-radius:12px;padding:24px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:800">New talent pool submission</h1>
      </div>
      <div style="background:#f9fafb;border-radius:10px;padding:20px">
        ${row('Name', c.full_name)}
        ${row('Email', c.email)}
        ${row('Experience', c.years_experience)}
        ${row('Skills', c.skills?.join(', '))}
        ${row('Superpower', c.superpower)}
      </div>
      ${c.story ? `<p style="font-size:13px;color:#374151;margin-top:16px"><em>"${c.story.slice(0, 600)}"</em></p>` : ''}
      <p style="font-size:12px;color:#9ca3af;margin-top:16px">Review in Super Admin → Talent</p>
    </div>`,
    c.email
  );
}

export function notifyNewPartner(a: {
  company_name: string; contact_name: string; email: string; category?: string | null;
  coverage?: string | null; offering?: string | null; scale_readiness?: string | null;
}) {
  return send(
    `New partner application: ${a.company_name}`,
    `<div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
      <div style="background:#0E6B60;border-radius:12px;padding:24px;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:20px;font-weight:800">New partner application</h1>
      </div>
      <div style="background:#f9fafb;border-radius:10px;padding:20px">
        ${row('Company', a.company_name)}
        ${row('Contact', a.contact_name)}
        ${row('Email', a.email)}
        ${row('Category', a.category)}
        ${row('Coverage', a.coverage)}
        ${row('Scale readiness', a.scale_readiness)}
      </div>
      ${a.offering ? `<p style="font-size:13px;color:#374151;margin-top:16px"><em>"${a.offering.slice(0, 600)}"</em></p>` : ''}
      <p style="font-size:12px;color:#9ca3af;margin-top:16px">Review in Super Admin → Partners</p>
    </div>`,
    a.email
  );
}