// ══════════════════════════════════════════════════════════════
//  Agent Chat API — Proxies to ElevenLabs text API
//  POST /api/agent-chat
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, agent_id } = body;

    if (!message || !agent_id) {
      return NextResponse.json({ error: 'message and agent_id required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Call ElevenLabs text-to-agent API
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agent_id}/chat`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('ElevenLabs chat error:', res.status, errText);
      return NextResponse.json({ reply: 'Sorry, I had trouble processing that. Please try again or email us at thrilznetwork@gmail.com.' });
    }

    // ElevenLabs returns a streaming response — collect it
    const chunks: string[] = [];
    const reader = res.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        // Parse SSE events
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) chunks.push(data.text);
              if (data.type === 'error') chunks.push(data.message || 'Error');
            } catch { /* skip unparseable lines */ }
          }
        }
      }
    }

    const reply = chunks.join('') || 'I received your message. How else can I help you?';
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error('Agent chat error:', err);
    return NextResponse.json({ reply: 'Sorry, I\'m having trouble connecting. Please try again or email us at thrilznetwork@gmail.com.' });
  }
}