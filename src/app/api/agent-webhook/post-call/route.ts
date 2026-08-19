import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const HOTEL_ID = '7feb88fa-a72c-4c5d-b094-b4948bdab1d7';
const TRANSPORT_AGENT_ID = 'agent_3801kzpf1mfyevn9y1pgjag2q1by';
const SERVICE_AGENT_ID = 'agent_4201kzpf22vcea2rapa87vfrbfz2';
const ORDERING_AGENT_ID = 'agent_3401kzpf2byyehpahr2bbjcn850x';

/**
 * ElevenLabs post-call webhook.
 * Fires after EVERY conversation ends (phone or chat).
 * 1. Saves transcript + analysis to agent_calls table
 * 2. Creates a request in the requests table so staff see it in the dashboard
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversation_id,
      transcript,
      analysis,
      metadata,
      status,
      call_id,
      agent_id,
    } = body;

    const supabase = getSupabaseAdmin();
    const resolvedAgentId = agent_id || metadata?.agent_id || TRANSPORT_AGENT_ID;

    // Determine agent type from agent_id
    let agentType = 'general';
    let agentName = 'AI Agent';
    if (resolvedAgentId === TRANSPORT_AGENT_ID) { agentType = 'Shuttle'; agentName = 'Shuttle Assistant'; }
    else if (resolvedAgentId === SERVICE_AGENT_ID) { agentType = 'Customer Service'; agentName = 'Customer Service'; }
    else if (resolvedAgentId === ORDERING_AGENT_ID) { agentType = 'Room Service'; agentName = 'Room Ordering'; }

    // Build a readable transcript string
    let transcriptText = '';
    if (Array.isArray(transcript)) {
      transcriptText = transcript
        .map((t: { role: string; message: string; time_in_seconds?: number }) => {
          const role = t.role === 'agent' ? agentName : 'Caller';
          return `[${role}] ${t.message}`;
        })
        .join('\n');
    } else if (typeof transcript === 'string') {
      transcriptText = transcript;
    }

    // Extract caller phone — ElevenLabs puts it in body.user_id or metadata sub-objects
    let callerPhone = '';
    if (body.user_id) callerPhone = body.user_id;
    else if (metadata?.sms?.sms_user_phone_number) callerPhone = metadata.sms.sms_user_phone_number;
    else if (metadata?.phone_call?.caller_number) callerPhone = metadata.phone_call.caller_number;
    else if (metadata?.from) callerPhone = metadata.from;
    else if (body.from) callerPhone = body.from;

    // Extract summary — ElevenLabs uses transcript_summary, not summary
    const summary = analysis?.transcript_summary || analysis?.summary || '';
    const callTitle = analysis?.call_summary_title || '';
    const dataCollection = analysis?.data_collection_results || null;

    // Extract caller info from transcript, metadata, or data collection
    let callerName = 'Unknown Caller';
    if (dataCollection?.name) callerName = dataCollection.name;
    else if (dataCollection?.guest_name) callerName = dataCollection.guest_name;
    else if (metadata?.caller_name) callerName = metadata.caller_name;
    else if (transcriptText) {
      // Try to extract name from transcript: look for "my name is X" or "name is X" or "I'm X" or "this is X"
      const nameMatch = transcriptText.match(/(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (nameMatch) callerName = nameMatch[1];
    }
    // Use call title as better fallback than "Unknown Caller"
    if (callerName === 'Unknown Caller' && callTitle) {
      callerName = `Caller (${callTitle})`;
    }

    // 1. Save to agent_calls table
    const { error: callError } = await supabase.from('agent_calls').insert({
      hotel_id: HOTEL_ID,
      conversation_id: conversation_id || call_id,
      agent_id: resolvedAgentId,
      status: (status === 'done' || status === 'success') ? 'completed' : (status || 'completed'),
      transcript: transcriptText,
      summary,
      analysis: analysis || null,
      data_collection: dataCollection || null,
      metadata: metadata || null,
      caller_name: callerName,
      caller_phone: callerPhone,
      request_created: false,
      escalated: false,
      started_at: metadata?.started_at || new Date().toISOString(),
      ended_at: new Date().toISOString(),
    });

    if (callError) {
      console.error('Webhook: Failed to save call:', callError.message);
    }

    // 2. Create a request in the requests table so staff sees it in the dashboard
    // Only create if this wasn't a shuttle booking (book_shuttle already creates one)
    // This ensures EVERY call shows up even if no tool was called
    const requestType = agentType === 'Shuttle' ? 'Shuttle Call' : agentType === 'Customer Service' ? 'Service Call' : agentType === 'Room Service' ? 'Order Call' : 'AI Call';

    const requestDetails = summary
      ? `[${agentName}] ${summary}${callerPhone ? ` | Caller: ${callerPhone}` : ''}`
      : `[${agentName}] Call from ${callerName}${callerPhone ? ` (${callerPhone})` : ''}. ${transcriptText ? 'Transcript saved.' : 'No transcript.'}`;

    const { error: reqError } = await supabase.from('requests').insert({
      hotel_id: HOTEL_ID,
      guest_name: callerName,
      room: 'N/A',
      type: requestType,
      details: requestDetails,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (reqError) {
      console.error('Webhook: Failed to create request:', reqError.message);
    }

    // 3. If data_collection has demo lead info → save to demo_leads
    if (dataCollection) {
      const name = dataCollection.name || dataCollection.Name;
      const email = dataCollection.email || dataCollection.Email;
      const property = dataCollection.property || dataCollection.Property || dataCollection.property_name;

      if (email) {
        await supabase.from('demo_leads').insert({
          name: name || 'Unknown',
          email,
          property_name: property || null,
          source: 'agent_chat',
          notes: `Auto-captured from conversation ${conversation_id}`,
          created_at: new Date().toISOString(),
        }).then(({ error: leadErr }) => {
          if (leadErr) console.error('Webhook: Demo lead save failed:', leadErr.message);
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}