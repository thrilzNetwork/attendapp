'use client';

import { useState, useEffect } from 'react';
import { getAgentConfig, type AgentConfig } from '@/lib/supabase';
import { Phone, X, Mic, MicOff } from 'lucide-react';

const TEAL = '#0D9488';

export default function GuestAgentButton({ hotelId, roomNumber, guestName }: { hotelId: string; roomNumber?: string; guestName?: string }) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    getAgentConfig(hotelId).then(setConfig);
  }, [hotelId]);

  if (!config || !config.is_active) return null;

  return (
    <>
      {/* Floating call button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform animate-pulse"
        style={{ backgroundColor: TEAL }}
      >
        <Phone size={22} />
      </button>

      {/* Agent modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: TEAL }}>
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-gray-900">Front Desk Agent</p>
                  <p className="text-[11px] text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* ElevenLabs ConvAI Widget */}
            <div className="flex-1 min-h-[300px] bg-gray-50 p-4">
              {config.elevenlabs_agent_id ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white animate-pulse" style={{ backgroundColor: TEAL }}>
                    <Phone size={28} />
                  </div>
                  <p className="text-[14px] font-semibold text-gray-700">Connected to Front Desk</p>
                  <p className="text-[12px] text-gray-400 text-center">
                    {config.first_message || 'How can I help you today?'}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {guestName && `Caller: ${guestName}`}
                    {roomNumber && ` • Room ${roomNumber}`}
                  </p>
                  {/* ElevenLabs ConvAI embed — will be wired with the actual widget */}
                  <div id="elevenlabs-convai" className="w-full" data-agent-id={config.elevenlabs_agent_id} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Phone size={32} className="mb-2" />
                  <p className="text-[13px]">AI Agent not configured for this hotel yet.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] text-gray-400">Powered by Attenda AI</p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-full bg-red-50 text-red-600 text-[12px] font-semibold"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}