'use client';

import { useConversation, ConversationProvider } from '@elevenlabs/react';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

const TEAL = '#0D9488';
const AGENT_ID = 'agent_4101kzn4ysvjfaava4ck5ggdt5ba';

interface Message {
  role: 'agent' | 'user';
  text: string;
}

export default function ElevenLabsWidget() {
  return (
    <ConversationProvider>
      <ElevenLabsWidgetInner />
    </ConversationProvider>
  );
}

function ElevenLabsWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => setConnected(true),
    onDisconnect: () => { setConnected(false); setLoading(false); },
    onMessage: (props) => {
      const { source, message } = props as { source: string; message: string };
      if (source === 'user') {
        setMessages(prev => [...prev, { role: 'user', text: message }]);
      } else {
        setMessages(prev => [...prev, { role: 'agent', text: message }]);
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggle = async () => {
    if (!isOpen) {
      setIsOpen(true);
      if (!connected) {
        try {
          await conversation.startSession({
            agentId: AGENT_ID,
            configOverride: {
              conversation: { text_only: true },
            },
          } as Record<string, unknown>);
        } catch (e) {
          console.error('Failed to start session:', e);
        }
      }
    } else {
      if (connected) {
        await conversation.endSession();
      }
      setIsOpen(false);
    }
  };

  const send = async () => {
    if (!input.trim() || loading || !connected) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    conversation.sendUserMessage(text);
  };

  useEffect(() => {
    return () => {
      if (connected) conversation.endSession();
    };
  }, [connected]);

  return (
    <>
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
        style={{ backgroundColor: TEAL }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '520px', maxHeight: '70vh' }}>
          <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ backgroundColor: TEAL }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-[14px]">👋</div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white">Hello!</p>
              <p className="text-[10px] text-white/70">
                {!connected ? 'Connecting…' : 'Online'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/10">
              <X size={16} className="text-white/70" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="animate-spin text-teal-600" />
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user' ? 'text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                }`} style={msg.role === 'user' ? { backgroundColor: TEAL } : {}}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-gray-100 bg-white flex gap-2 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type your question..."
              disabled={loading || !connected}
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none focus:border-teal-300 disabled:opacity-50"
            />
            <button onClick={send} disabled={loading || !input.trim() || !connected} className="p-2.5 rounded-xl text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}