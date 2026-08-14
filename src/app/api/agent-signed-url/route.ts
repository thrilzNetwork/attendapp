// ══════════════════════════════════════════════════════════════
//  Signed URL API — Generates signed URL for ElevenLabs agent
//  GET /api/agent-signed-url
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export async function GET() {
  // Overridable in Netlify (ELEVENLABS_AGENT_ID) so the agent can be swapped
  // without a code change. Defaults to the "Attenda Super Agent".
  const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_4101kzn4ysvjfaava4ck5ggdt5ba';
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    // Correct ElevenLabs endpoint: get-signed-url with agent_id query param.
    // (The old /convai/agents/{id}/signed-url path returns 404.)
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
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