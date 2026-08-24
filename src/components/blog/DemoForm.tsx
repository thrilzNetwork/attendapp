'use client';

import { useState } from "react";

export default function DemoForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = async () => {
    if (!email) return;
    setStatus('sending');
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '' },
        body: JSON.stringify({
          type: 'enrollment_inquiry',
          data: {
            contactName: 'Blog Reader',
            contactEmail: email,
            contactPhone: '',
            propertyName: 'Interested in Attenda (Blog)',
            propertyType: 'Property',
            rooms: 'Not specified',
            city: '',
            message: 'I want to learn more about Attenda for my property.',
          },
        }),
      });
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 text-center">
        <p className="text-[16px] font-bold text-gray-900">We&apos;ll be in touch!</p>
        <p className="text-[13px] text-gray-600 mt-1">Expect a reply within one business day.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors"
      />
      <button
        onClick={handleSubmit}
        disabled={status === 'sending'}
        className="px-5 py-3 rounded-xl text-white font-bold text-[13px] bg-teal-600 hover:bg-teal-700 transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending...' : 'Get a Demo'}
      </button>
    </div>
  );
}
