'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

const TEAL = '#0D9488';

interface Message {
  role: 'agent' | 'user';
  text: string;
}

export default function SuperAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: "Hi! I'm the Attenda assistant. I can answer questions about our hotel operations platform, pricing, and features — or schedule a demo call for you. How can I help?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingMsgRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const res = await fetch('/api/agent-signed-url');
      const data = await res.json();
      if (!data.signed_url) throw new Error('No signed URL');

      const ws = new WebSocket(data.signed_url);

      ws.onopen = () => {
        setWsReady(true);
        // Send any pending message
        if (pendingMsgRef.current) {
          ws.send(JSON.stringify({
            type: 'user_message',
            text: pendingMsgRef.current,
          }));
          pendingMsgRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'agent_response' && msg.text) {
            setMessages(prev => [...prev, { role: 'agent', text: msg.text }]);
            setLoading(false);
          } else if (msg.type === 'error') {
            setMessages(prev => [...prev, { role: 'agent', text: "Sorry, I had trouble with that. Please try again or email us at thrilznetwork@gmail.com." }]);
            setLoading(false);
          }
        } catch { /* skip */ }
      };

      ws.onerror = () => {
        setWsReady(false);
        setLoading(false);
      };

      ws.onclose = () => {
        setWsReady(false);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('WebSocket connection failed', e);
      setLoading(false);
    }
  }, []);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Connect if not already
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      pendingMsgRef.current = userMsg;
      await connect();
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'user_message',
      text: userMsg,
    }));
  }, [input, loading, connect]);

  const handleOpen = () => {
    if (!isOpen && !wsRef.current) {
      connect();
    }
    setIsOpen(!isOpen);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"
        style={{ backgroundColor: TEAL }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '520px', maxHeight: '70vh' }}>
          <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ backgroundColor: TEAL }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-[14px]">A</div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white">Attenda Assistant</p>
              <p className="text-[10px] text-white/70">
                {wsReady ? 'Online' : 'Connecting…'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/10">
              <X size={16} className="text-white/70" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
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
              disabled={loading}
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-[13px] border border-gray-200 outline-none focus:border-teal-300 disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl text-white disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}