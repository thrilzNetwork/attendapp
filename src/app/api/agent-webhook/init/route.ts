import { NextRequest, NextResponse } from 'next/server';

/**
 * ElevenLabs conversation initiation webhook.
 * Called when a conversation starts — lets us inject dynamic context.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_data } = body;

    // Inject dynamic variables that the agent can use in its prompt
    const dynamicVariables: Record<string, string> = {
      current_date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      }),
      current_time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', minute: '2-digit' 
      }),
      website_url: 'https://attendaapp.com',
    };

    // If user_data has email (from widget), we can look up their hotel
    if (user_data?.email) {
      dynamicVariables.user_email = user_data.email;
    }

    return NextResponse.json({
      dynamic_variables: dynamicVariables,
      conversation_config_override: {
        conversation: {
          text_only: true,
        },
      },
    });
  } catch (e) {
    console.error('Init webhook error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}