import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Attenda <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    if (type === 'tenant_onboarding') {
      const { hotelName, slug, adminEmail, guestUrl, adminUrl } = data;
      if (!adminEmail) return NextResponse.json({ ok: true });
      await resend.emails.send({
        from: FROM,
        to: adminEmail,
        subject: `Your Attenda property is live — ${hotelName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Welcome to Attenda</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your property is ready to go live</p>
            </div>
            <h2 style="font-size:18px;color:#111;margin-bottom:4px">${hotelName}</h2>
            <p style="color:#666;font-size:13px;margin-bottom:24px">Slug: @${slug}</p>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Guest App URL</p>
              <a href="${guestUrl}" style="color:#0D9488;font-size:14px;word-break:break-all">${guestUrl}</a>
              <p style="font-size:11px;color:#aaa;margin:4px 0 0">Share this with guests or embed in QR codes</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Staff Dashboard URL</p>
              <a href="${adminUrl}" style="color:#0D9488;font-size:14px;word-break:break-all">${adminUrl}</a>
              <p style="font-size:11px;color:#aaa;margin:4px 0 0">Default admin PIN: <strong>2025</strong></p>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center">Powered by Attenda — Hotel Guest Experience Platform</p>
          </div>
        `,
      });
    }

    if (type === 'new_request') {
      const { notificationEmail, hotelName, guestName, room, requestType, details } = data;
      if (!notificationEmail) return NextResponse.json({ ok: true });
      await resend.emails.send({
        from: FROM,
        to: notificationEmail,
        subject: `[${hotelName}] New ${requestType} — Room ${room}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <div style="background:#f59e0b;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <p style="color:white;font-weight:800;font-size:16px;margin:0">New ${requestType} Request</p>
              <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:4px 0 0">${hotelName}</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 4px">Guest</p>
              <p style="font-size:15px;font-weight:700;color:#111;margin:0">${guestName} — Room ${room}</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 4px">Details</p>
              <p style="font-size:14px;color:#333;margin:0;line-height:1.5">${details}</p>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px">Log into your Attenda dashboard to manage this request.</p>
          </div>
        `,
      });
    }

    if (type === 'food_order') {
      const { notificationEmail, partnerEmail, hotelName, guestName, room, partnerName, items, total } = data;
      const recipients = [notificationEmail, partnerEmail].filter(Boolean) as string[];
      if (recipients.length === 0) return NextResponse.json({ ok: true });
      const itemRows = (items as { name: string; qty: number; price: number }[])
        .map(i => `<tr><td style="padding:6px 0;font-size:13px;color:#333">${i.qty}x ${i.name}</td><td style="padding:6px 0;font-size:13px;color:#333;text-align:right">$${(i.qty * i.price).toFixed(2)}</td></tr>`)
        .join('');
      await resend.emails.send({
        from: FROM,
        to: recipients,
        subject: `[${hotelName}] Food Order — ${partnerName} — Room ${room}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <div style="background:#059669;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <p style="color:white;font-weight:800;font-size:16px;margin:0">New Food Order</p>
              <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:4px 0 0">${hotelName} · ${partnerName}</p>
            </div>
            <p style="font-size:15px;font-weight:700;color:#111;margin-bottom:16px">${guestName} — Room ${room}</p>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <table style="width:100%;border-collapse:collapse">
                ${itemRows}
                <tr style="border-top:2px solid #e5e7eb">
                  <td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111">Total</td>
                  <td style="padding:10px 0 0;font-size:15px;font-weight:800;color:#111;text-align:right">$${total}</td>
                </tr>
              </table>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center">Charged to room or paid at front desk.</p>
          </div>
        `,
      });
    }

    if (type === 'guest_message') {
      const { notificationEmail, hotelName, guestName, room, message } = data;
      if (!notificationEmail) return NextResponse.json({ ok: true });
      await resend.emails.send({
        from: FROM,
        to: notificationEmail,
        subject: `[${hotelName}] Message from ${guestName} — Room ${room}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <div style="background:#6B1D3C;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <p style="color:white;font-weight:800;font-size:16px;margin:0">Guest Message</p>
              <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:4px 0 0">${hotelName}</p>
            </div>
            <p style="font-size:14px;font-weight:700;color:#111;margin-bottom:16px">${guestName} — Room ${room}</p>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;border-left:4px solid #6B1D3C">
              <p style="font-size:14px;color:#333;margin:0;line-height:1.6">${message}</p>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center;margin-top:24px">Reply from your Attenda dashboard.</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
