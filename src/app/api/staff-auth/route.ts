import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name, pin, hotelSlug } = await req.json();

    // Create Supabase admin client with service_role for auth admin operations
    // We use the anon key since we're creating users via signUp (doesn't need service_role)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    if (action === 'setup') {
      // First-time staff setup: create auth user + PIN login
      if (!email || !password || !name || !pin || !hotelSlug) {
        return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
      }

      // Create the auth user
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${req.headers.get('origin') || 'https://attendaapp.com'}/staff`,
        },
      });
      if (signUpErr) throw signUpErr;

      return NextResponse.json({ ok: true, user: authData.user, session: authData.session });
    }

    if (action === 'login') {
      // Email + password login
      if (!email || !password) {
        return NextResponse.json({ ok: false, error: 'Email and password required.' }, { status: 400 });
      }
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      return NextResponse.json({ ok: true, user: data.user, session: data.session });
    }

    if (action === 'check_session') {
      const { data: { session } } = await supabase.auth.getSession();
      return NextResponse.json({ ok: true, user: session?.user || null });
    }

    if (action === 'sign_out') {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
