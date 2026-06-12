import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const { name, contact, phone, email, hotel } = body;

    if (!name || !contact || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase.from('partner_applications').insert({
      restaurant_name: name,
      contact_name: contact,
      phone,
      email,
      hotel_name: hotel || null,
      status: 'pending',
    });

    if (error) {
      console.error('Partner application insert error:', error);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Partner application error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}