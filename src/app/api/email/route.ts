import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Attenda <noreply@attendaapp.com>';
const SUPER_BCC = 'thrilznetwork@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();

    if (type === 'tenant_onboarding') {
      const { hotelName, slug, adminEmail, guestUrl, adminUrl } = data;
      if (!adminEmail) return NextResponse.json({ ok: true });
      await resend.emails.send({
        from: FROM,
        to: adminEmail,
        bcc: [SUPER_BCC],
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
        bcc: [SUPER_BCC],
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

    if (type === 'assignment') {
      const { notificationEmail, hotelName, guestName, room, requestType, staffName } = data;
      if (!notificationEmail) return NextResponse.json({ ok: true });
      await resend.emails.send({
        from: FROM,
        to: notificationEmail,
        bcc: [SUPER_BCC],
        subject: `[${hotelName}] Request assigned to ${staffName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <div style="background:#6B1D3C;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <p style="color:white;font-weight:800;font-size:16px;margin:0">Request Assigned</p>
              <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:4px 0 0">${hotelName}</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 4px">Guest</p>
              <p style="font-size:15px;font-weight:700;color:#111;margin:0">${guestName} — Room ${room}</p>
              <p style="font-size:13px;color:#555;margin:4px 0 0">Request type: ${requestType}</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 4px">Assigned To</p>
              <p style="font-size:15px;font-weight:700;color:#0D9488;margin:0">${staffName}</p>
            </div>
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
        bcc: [SUPER_BCC],
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
        bcc: [SUPER_BCC],
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

    if (type === 'guest_welcome') {
      const { notificationEmail, hotelName, guestName, room, checkout, hotelSlug } = data;
      const staffDashUrl = `https://attendaapp.com/staff?hotel=${hotelSlug}`;
      if (notificationEmail) {
        await resend.emails.send({
          from: FROM,
          to: notificationEmail,
          bcc: [SUPER_BCC],
          subject: `[${hotelName}] Guest checked in via app — ${guestName}, Room ${room}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
              <div style="background:#0D9488;border-radius:10px;padding:16px 20px;margin-bottom:20px">
                <p style="color:white;font-weight:800;font-size:16px;margin:0">Guest Checked In via App</p>
                <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:4px 0 0">${hotelName}</p>
              </div>
              <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px">
                <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 4px">Guest</p>
                <p style="font-size:16px;font-weight:800;color:#111;margin:0">${guestName}</p>
                <p style="font-size:13px;color:#555;margin:4px 0 0">Room ${room} · Checkout: ${checkout}</p>
              </div>
              <p style="font-size:13px;color:#666;margin-bottom:16px">This guest has connected to your Attenda guest app and may submit requests, order food, or send messages.</p>
              <a href="${staffDashUrl}" style="display:inline-block;background:#0D9488;color:white;padding:12px 24px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none">Open Staff Dashboard</a>
            </div>
          `,
        });
      }
    }

    if (type === 'staff_welcome') {
      const { staffEmail, staffName, staffRole, hotelName, hotelSlug, pin } = data;
      if (!staffEmail) return NextResponse.json({ ok: true });
      const dashUrl = `https://attendaapp.com/staff?hotel=${hotelSlug}`;
      await resend.emails.send({
        from: FROM,
        to: staffEmail,
        bcc: [SUPER_BCC],
        subject: `Welcome to ${hotelName} — Your Attenda staff account`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#6B1D3C;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
              <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Welcome to the team, ${staffName}!</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${hotelName} · Attenda Staff Dashboard</p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Your Account</p>
              <p style="font-size:14px;color:#333;margin:0 0 4px"><strong>Name:</strong> ${staffName}</p>
              <p style="font-size:14px;color:#333;margin:0 0 4px"><strong>Role:</strong> ${staffRole}</p>
              <p style="font-size:14px;color:#333;margin:0"><strong>PIN Code:</strong> <span style="font-family:monospace;font-size:18px;font-weight:800;color:#6B1D3C">${pin}</span></p>
            </div>
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Staff Dashboard</p>
              <a href="${dashUrl}" style="color:#0D9488;font-size:14px;word-break:break-all">${dashUrl}</a>
              <p style="font-size:11px;color:#aaa;margin:4px 0 0">Log in with your PIN to access the dashboard</p>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center">Powered by Attenda — Hotel Guest Experience Platform</p>
          </div>
        `,
      });
    }

    if (type === 'enrollment_inquiry') {
      const { contactName, contactEmail, contactPhone, propertyName, propertyType, rooms, city, message } = data;

      // Notify admin
      await resend.emails.send({
        from: FROM,
        to: SUPER_BCC,
        subject: `New Enrollment Inquiry: ${propertyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
            <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px">
              <h1 style="color:white;margin:0;font-size:20px;font-weight:800">New Property Inquiry</h1>
              <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Someone wants to join Attenda</p>
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
              <p style="font-size:13px;color:#555;margin:0 0 4px">${city ? city + ' · ' : ''}${propertyType} · ${rooms} rooms</p>
            </div>
            ${message ? `
            <div style="background:#f9fafb;border-radius:10px;padding:20px;border-left:4px solid #0D9488">
              <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 6px">Message</p>
              <p style="font-size:14px;color:#333;margin:0;line-height:1.6">${message}</p>
            </div>
            ` : ''}
          </div>
        `,
      });

      // Confirmation to the requester
      if (contactEmail) {
        await resend.emails.send({
          from: FROM,
          to: contactEmail,
          subject: `We got your request — ${propertyName}`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px">
              <div style="background:#0D9488;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
                <h1 style="color:white;margin:0;font-size:22px;font-weight:800">Request received!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">We'll be in touch within 1 business day</p>
              </div>
              <p style="font-size:15px;color:#111;margin-bottom:8px">Hi ${contactName},</p>
              <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:20px">
                Thanks for reaching out about <strong>${propertyName}</strong>. We received your inquiry and will contact you shortly with a personalized demo and a plan built specifically for your operation.
              </p>
              <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px">
                <p style="font-size:12px;font-weight:700;color:#999;text-transform:uppercase;margin:0 0 8px">What happens next</p>
                <p style="font-size:13px;color:#555;margin:0 0 6px">1. We review your property details</p>
                <p style="font-size:13px;color:#555;margin:0 0 6px">2. We schedule a live demo tailored to your operation</p>
                <p style="font-size:13px;color:#555;margin:0">3. You're live — usually within the same week</p>
              </div>
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
