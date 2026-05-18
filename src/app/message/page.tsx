'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, getHotelConfig } from '@/lib/supabase';
import { goBackToHotel } from '@/lib/guest-context';

type Message = {
  from: 'guest' | 'bot';
  text: string;
  isConfirm?: boolean;
  confirmType?: string;
  confirmDetails?: string;
  ts?: number;
};

export default function MessagePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: 'Hello! How can I assist you today? I can help with room service, transport, nearby attractions, and more.' }
  ]);
  const [guestName, setGuestName] = useState('Guest');
  const [guestRoom, setGuestRoom] = useState('?');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('guestSession');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setGuestName(s.name || 'Guest');
        setGuestRoom(s.room || localStorage.getItem('attenda_qr_room') || '?');
      } catch {
        localStorage.removeItem('guestSession');
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createRequest = async (type: string, details: string) => {
    const hotel = await getHotelConfig();
    await supabase.from('requests').insert({
      hotel_id: hotel?.id,
      guest_name: guestName,
      room: guestRoom,
      type,
      details,
      status: 'pending',
    });
    // Send email notification
    if (hotel?.notificationEmail) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_request',
          data: {
            notificationEmail: hotel.notificationEmail,
            hotelName: hotel.name,
            guestName,
            room: guestRoom,
            requestType: type,
            details,
          },
        }),
      }).catch(() => {});
    }
  };

  const handleConfirm = async (type: string, details: string) => {
    await createRequest(type, details);
    setMessages(prev => [
      ...prev,
      { from: 'guest', text: `Yes, please send ${details.toLowerCase()}` },
      { from: 'bot', text: `✅ Request sent! Our team will take care of this. You can track it in the Live Orders dashboard.` }
    ]);
  };

  const handleDismiss = () => {
    setMessages(prev => [
      ...prev,
      { from: 'guest', text: 'No thanks' },
      { from: 'bot', text: 'No problem! Let me know if you need anything else.' }
    ]);
  };

  const send = async () => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    const ts = Date.now();

    const hotel = await getHotelConfig();
    await supabase.from('messages').insert({
      hotel_id: hotel?.id,
      guest_name: guestName,
      room: guestRoom,
      sender: 'guest',
      body: userMsg,
    });
    if (hotel?.notificationEmail) {
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'guest_message',
          data: {
            notificationEmail: hotel.notificationEmail,
            hotelName: hotel.name,
            guestName,
            room: guestRoom,
            message: userMsg,
          },
        }),
      }).catch(() => {});
    }

    setMessages(prev => [...prev, { from: 'guest', text: userMsg, ts }]);
    setText('');

    // Determine if this is a requestable keyword
    const lower = userMsg.toLowerCase();
    const requestable:
      | { type: string; details: string; reply: string }
      | undefined
      = (() => {
        if (lower.includes('towel')) return { type: 'Amenity Request', details: 'Towel Service', reply: 'I can send a towel request to housekeeping for you. Would you like me to do that?' };
        if (lower.includes('toilet') || lower.includes('toiletries')) return { type: 'Amenity Request', details: 'Toiletry Supplies', reply: 'I can request toiletry supplies from housekeeping. Shall I send that?' };
        if (lower.includes('water') || lower.includes('bottle')) return { type: 'Amenity Request', details: 'Water / Beverages', reply: 'I can send a water request to room service. Would you like me to?' };
        if (lower.includes('taxi') || lower.includes('uber') || lower.includes('lyft')) return { type: 'Transport Request', details: 'Ride Service', reply: 'I can request transport for you. Would you like me to send a transport request?' };
        if (lower.includes('restaurant') || lower.includes('food') || lower.includes('order')) return { type: 'Food Order', details: 'Restaurant Order', reply: 'I can place a food order request for you. Shall I send that to our restaurant partners?' };
        if (lower.includes('clean') || lower.includes('housekeep')) return { type: 'Housekeeping', details: 'Cleaning Service', reply: 'I can send a housekeeping request for you. Would you like me to?' };
        if (lower.includes('late') && (lower.includes('check') || lower.includes('checkout'))) return { type: 'Front Desk Request', details: 'Late Checkout', reply: 'I can send a late checkout request to the front desk. Shall I?' };
        if (lower.includes('wake') || lower.includes('alarm')) return { type: 'Front Desk Request', details: 'Wake-Up Call', reply: 'I can request a wake-up call from the front desk. Would you like me to?' };
        return undefined;
      })();

    setTimeout(() => {
      if (requestable) {
        setMessages(prev => [
          ...prev,
          {
            from: 'bot',
            text: requestable.reply,
            isConfirm: true,
            confirmType: requestable.type,
            confirmDetails: requestable.details,
          }
        ]);
      } else {
        let reply = 'Thanks for your message! Our front desk team will assist you shortly.';
        if (lower.includes('wifi') || lower.includes('internet')) reply = 'WiFi is complimentary! Network: BWFREE — ask front desk for the password.';
        else if (lower.includes('pool')) reply = 'Our pool is open 6 AM – 10 PM daily, located on the 2nd floor.';
        else if (lower.includes('breakfast')) reply = 'Complimentary breakfast is served 6:30 AM – 9:30 AM in the lobby.';
        else if (lower.includes('check')) reply = 'Check-out is at 11:00 AM. Late check-out available upon request at front desk.';
        setMessages(prev => [...prev, { from: 'bot', text: reply }]);
      }
    }, 600);
  };

  const quickReplies: { label: string; action?: { type: string; details: string } }[] = [
    { label: 'WiFi Password' },
    { label: 'Pool Hours' },
    { label: 'Breakfast Time' },
    { label: 'Request Towels',  action: { type: 'Amenity Request',    details: 'Towel Service'   } },
    { label: 'Late Check-out',  action: { type: 'Front Desk Request', details: 'Late Checkout'   } },
    { label: 'Housekeeping',    action: { type: 'Housekeeping',       details: 'Cleaning Service'} },
    { label: 'Wake-Up Call',    action: { type: 'Front Desk Request', details: 'Wake-Up Call'    } },
  ];

  return (
    <div className="h-dvh w-full bg-[#F4F4F5] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-3 flex items-center gap-3 bg-white border-b border-gray-100">
        <button onClick={() => goBackToHotel(router)} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center active:scale-95">
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
                {m.isConfirm ? (
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                    <p className="text-[13px] text-gray-800 mb-3 leading-relaxed">{m.text}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(m.confirmType!, m.confirmDetails!)}
                        className="flex-1 py-2.5 rounded-xl text-white text-[12px] font-bold active:scale-95"
                        style={{ backgroundColor: '#6B1D3C' }}
                      >
                        Yes, send request
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-[12px] font-bold active:scale-95"
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.from === 'guest'
                      ? 'bg-[#6B1D3C] text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                  }`}>
                    {m.text}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick replies */}
          {messages.length < 4 && (
            <div className="shrink-0 px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {quickReplies.map((q) => (
                <button
                  key={q.label}
                  onClick={async () => {
                    if (q.action) {
                      // Service requests: create immediately, skip the confirm step
                      setMessages(prev => [
                        ...prev,
                        { from: 'guest', text: q.label },
                        { from: 'bot', text: `✅ "${q.action!.details}" request sent to our team! We'll take care of it shortly.` },
                      ]);
                      await createRequest(q.action.type, q.action.details);
                    } else if (q.label === 'Book Transport') {
                      window.location.href = '/transport';
                    } else {
                      setText(q.label);
                    }
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-600 font-medium active:scale-95"
                >
                  {q.label}
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
