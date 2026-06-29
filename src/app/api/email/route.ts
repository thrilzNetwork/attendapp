import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isAllowedOrigin, originBlocked, validateApiKey } from '@/lib/api-auth';

const FROM = 'Attenda <noreply@attendaapp.com>';
const SUPER_BCC = 'thrilznetwork@gmail.com';

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(apiKey);
};

export async function POST(req: NextRequest) {
  try {
    if (!validateApiKey(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAllowedOrigin(req.headers.get('origin'), req.headers.get('referer'))) {
      return originBlocked();
    }

    const { type, data } = await req.json();

    // ── 1. Property goes live ───────────────────────────────────
    if (type === 'tenant_onboarding') {
      const { hotelName, slug, adminEmail, guestUrl, adminUrl } = data;
      if (!adminEmail) return NextResponse.json({ ok: true });
      await getResend().emails.send({
        from: FROM, to: adminEmail, bcc: [SUPER_BCC],
        subject: `Your Attenda property is live — ${hotelName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Welcome to Attenda</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your property is ready to go live</p>
            </div>
            <h2 style="font-size:18px;color:#111;margin-bottom:4px">${hotelName}</h2>
            <p style="color:#666;font-size:13px;margin-bottom:24px">Slug: @${slug}</p>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Guest App URL</p>
              <a href="${guestUrl}" style="color:#0D9488;font-size:14px;word-break:break-all">${guestUrl}</a>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Staff Dashboard</p>
              <a href="${adminUrl}" style="color:#0D9488;font-size:14px;word-break:break-all">${adminUrl}</a>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center">Powered by Attenda — Hospitality Experience Platform</p>
          </div>
        `,
      });
    }

    // ── 2. Food order (partner must know immediately) ───────────
    if (type === 'food_order') {
      const { notificationEmail, partnerEmail, hotelName, guestName, room, partnerName, items, total } = data;
      const recipients = [notificationEmail, partnerEmail].filter(Boolean) as string[];
      if (recipients.length === 0) return NextResponse.json({ ok: true });
      const itemRows = (items as { name: string; qty: number; price: number }[])
        .map(i => `<tr><td style="padding:6px 0;font-size:13px;color:#333">${i.qty}× ${i.name}</td><td style="padding:6px 0;font-size:13px;color:#333;text-align:right">$${(i.qty * i.price).toFixed(2)}</td></tr>`)
        .join('');
      await getResend().emails.send({
        from: FROM, to: recipients, bcc: [SUPER_BCC],
        subject: `[${hotelName}] Food Order — ${partnerName} — Room ${room}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <div style="background:#059669;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <p style="color:white;font-weight:800;font-size:16px;margin:0">New Food Order</p>
              <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:4px 0 0">${hotelName} · ${partnerName}</p>
            </div>
            <p style="font-size:15px;font-weight:700;color:#111;margin-bottom:16px">${guestName} — Room ${room}</p>
            <div style="background:#f9fafb;border-radius:10px;padding:20px">
              <table style="width:100%;border-collapse:collapse">
                ${itemRows}
                <tr style="border-top:2px solid #e5e7eb">
                  <td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111">Total</td>
                  <td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111;text-align:right">$${total}</td>
                </tr>
              </table>
            </div>
          </div>
        `,
      });
    }

    // ── 3. Staff invitation ─────────────────────────────────────
    if (type === 'staff_invitation') {
      const { staffEmail, staffName, staffRole, hotelName, hotelSlug, setupUrl } = data;
      if (!staffEmail) return NextResponse.json({ ok: true });
      await getResend().emails.send({
        from: FROM, to: staffEmail, bcc: [SUPER_BCC],
        subject: `You're invited to ${hotelName} — Set up your Attenda account`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px;font-weight:800">You're invited!</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${hotelName} · Staff Dashboard</p>
            </div>
            <p style="font-size:16px;color:#111;margin-bottom:16px">Hi ${staffName},</p>
            <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:24px">
              Your account as <strong>${staffRole}</strong> at <strong>${hotelName}</strong> has been created.
              Click below to set your password and get started.
            </p>
            <a href="${setupUrl}" style="display:inline-block;background:#0D9488;color:white;padding:14px 28px;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:24px">
              Complete Your Setup →
            </a>
            <div style="background:#f9fafb;border-radius:10px;padding:20px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Dashboard URL</p>
              <a href="https://attendaapp.com/staff?hotel=${hotelSlug}" style="color:#0D9488;font-size:14px;word-break:break-all">https://attendaapp.com/staff?hotel=${hotelSlug}</a>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px">Powered by Attenda — Hospitality Experience Platform</p>
          </div>
        `,
      });
    }

    // ── 4. Weekly schedule published ────────────────────────────
    if (type === 'schedule_published') {
      const { staffEmail, staffName, hotelName, weekStart, weekEnd, days } = data;
      if (!staffEmail) return NextResponse.json({ ok: true });
      const dayRows = (days as { date: string; time: string; role: string; notes: string }[]).map(d => `
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#111">${d.date}</td>
          <td style="padding:10px 8px;font-size:13px;color:#555">${d.time || '—'}</td>
          <td style="padding:10px 8px;font-size:12px;color:#888;text-transform:capitalize">${d.role || 'staff'}</td>
          <td style="padding:10px 8px;font-size:12px;color:#888">${d.notes || ''}</td>
        </tr>
      `).join('');
      await getResend().emails.send({
        from: FROM, to: staffEmail, bcc: [SUPER_BCC],
        subject: `[${hotelName}] Your schedule — ${weekStart} to ${weekEnd}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:20px 24px;margin-bottom:24px">
              <h1 style="color:white;margin:0;font-size:20px;font-weight:800">Weekly Schedule</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px">${hotelName} · ${weekStart} – ${weekEnd}</p>
            </div>
            <p style="font-size:15px;font-weight:700;color:#111;margin-bottom:16px">Hi ${staffName},</p>
            ${days.length === 0
              ? `<p style="font-size:14px;color:#888;text-align:center;padding:20px 0">No shifts scheduled for this week.</p>`
              : `<div style="background:#f9fafb;border-radius:10px;overflow:hidden;margin-bottom:16px">
                  <table style="width:100%;border-collapse:collapse">
                    <thead>
                      <tr style="background:#f3f4f6">
                        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;text-align:left">Date</th>
                        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;text-align:left">Time</th>
                        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;text-align:left">Role</th>
                        <th style="padding:10px 8px;font-size:11px;font-weight:700;color:#666;text-transform:uppercase;text-align:left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>${dayRows}</tbody>
                  </table>
                </div>`
            }
            <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px">View full schedule in your Attenda Staff Dashboard.</p>
          </div>
        `,
      });
    }

    // ── 5. New property enrollment inquiry ──────────────────────
    if (type === 'enrollment_inquiry') {
      const { contactName, contactEmail, contactPhone, propertyName, propertyType, rooms, city, message } = data;
      await getResend().emails.send({
        from: FROM, to: SUPER_BCC,
        subject: `New Enrollment Inquiry: ${propertyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px">
              <h1 style="color:white;margin:0;font-size:20px;font-weight:800">New Property Inquiry</h1>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 8px">Contact</p>
              <p style="font-size:14px;color:#333;margin:0 0 4px"><strong>${contactName}</strong></p>
              <p style="font-size:13px;color:#555;margin:0 0 4px">${contactEmail}</p>
              ${contactPhone ? `<p style="font-size:13px;color:#555;margin:0">${contactPhone}</p>` : ''}
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 8px">Property</p>
              <p style="font-size:15px;font-weight:800;color:#111;margin:0 0 4px">${propertyName}</p>
              <p style="font-size:13px;color:#555;margin:0">${city ? city + ' · ' : ''}${propertyType} · ${rooms} rooms</p>
            </div>
            ${message ? `<div style="background:#f9fafb;border-radius:10px;padding:20px;border-left:4px solid #0D9488"><p style="font-size:14px;color:#333;margin:0;line-height:1.6">${message}</p></div>` : ''}
          </div>
        `,
      });
      if (contactEmail) {
        await getResend().emails.send({
          from: FROM, to: contactEmail,
          subject: `We got your request — ${propertyName}`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
              <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
                <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Request received!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">We'll be in touch within 1 business day</p>
              </div>
              <p style="font-size:15px;color:#111;margin-bottom:8px">Hi ${contactName},</p>
              <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:20px">
                Thanks for reaching out about <strong>${propertyName}</strong>. We'll contact you shortly with a demo and plan built for your operation.
              </p>
              <p style="font-size:12px;color:#aaa;text-align:center">Questions? Reply to this email or reach us at thrilznetwork@gmail.com</p>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
