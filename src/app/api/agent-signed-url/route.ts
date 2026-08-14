// ══════════════════════════════════════════════════════════════
//  Signed URL API — Generates signed URL for ElevenLabs agent
//  GET /api/agent-signed-url
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export async function GET() {
  const agentId = 'agent_4101kzn4ysvjfaava4ck5ggdt5ba';
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}/signed-url`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Signed URL error:', res.status, err);
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ signed_url: data.signed_url });
  } catch (err: unknown) {
    console.error('Signed URL error:', err);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}