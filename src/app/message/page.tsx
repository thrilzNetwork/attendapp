'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MessagePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<{from: 'guest' | 'bot', text: string}[]>([
    { from: 'bot', text: 'Hello! How can I assist you today? I can help with room service, transport, nearby attractions, and more.' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { from: 'guest', text: userMsg }]);
    setText('');

    // Simple auto-reply based on keywords
    setTimeout(() => {
      let reply = 'Thanks for your message! Our front desk team will assist you shortly.';
      const lower = userMsg.toLowerCase();
      if (lower.includes('wifi') || lower.includes('internet')) reply = 'WiFi is complimentary! Network: BWFREE — ask front desk for the password.';
      else if (lower.includes('pool')) reply = 'Our pool is open 6 AM – 10 PM daily, located on the 2nd floor.';
      else if (lower.includes('breakfast')) reply = 'Complimentary breakfast is served 6:30 AM – 9:30 AM in the lobby.';
      else if (lower.includes('check')) reply = 'Check-out is at 11:00 AM. Late check-out available upon request at front desk.';
      else if (lower.includes('taxi') || lower.includes('uber')) reply = 'You can request transport through our app or call the front desk at ext. 0.';
      else if (lower.includes('towel') || lower.includes('toilet')) reply = 'Housekeeping can assist! Dial ext. 1 from your room phone or tap the Towel Request button below.';
      else if (lower.includes('restaurant') || lower.includes('food')) reply = 'Check the Nearby section for local restaurant partners, or room service is available 24/7.';
      
      setMessages(prev => [...prev, { from: 'bot', text: reply }]);
    }, 800);
  };

  const quickReplies = [
    'WiFi Password',
    'Pool Hours',
    'Breakfast Time',
    'Request Towels',
    'Book Transport',
    'Late Check-out',
  ];

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white border-b border-gray-100">
        <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold text-black">Front Desk</h1>
          <p className="text-[11px] text-green-500 font-medium">● Online now</p>
        </div>
      </div>

      {sent ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-black mb-1">Message Sent!</h2>
          <p className="text-[13px] text-gray-500 text-center">Our team will respond shortly.</p>
          <button onClick={() => { setSent(false); setMessages([{ from: 'bot', text: 'Hello! How can I assist you today?' }]); }} className="mt-5 text-[13px] font-semibold text-[#6B1D3C]">New Message</button>
        </div>
      ) : (
        <>
          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'guest' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.from === 'guest'
                    ? 'bg-[#6B1D3C] text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          {messages.length < 3 && (
            <div className="shrink-0 px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  onClick={() => { setText(q); }}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 font-medium active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 px-4 pb-5 pt-2 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-50 rounded-full px-4 py-3 text-[14px] text-gray-800 outline-none placeholder:text-gray-400 border border-gray-200 focus:border-[#6B1D3C]"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-30"
                style={{ backgroundColor: text.trim() ? '#6B1D3C' : '#e5e7eb' }}
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
