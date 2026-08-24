'use client';

import { useState } from "react";

export function ShareBar() {
  return (
    <div className="flex items-center justify-between border-y border-gray-100 py-4 mb-10">
      <div className="flex items-center gap-2 text-[12px] text-gray-500">
        <span className="font-semibold">Share this article</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const url = window.location.href;
            window.location.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-[12px] font-bold transition-all active:scale-[0.97] shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
          Share on LinkedIn
        </button>
        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
              const btn = document.getElementById('copy-btn');
              if (btn) {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy Link'; }, 2000);
              }
            });
          }}
          id="copy-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-bold transition-all active:scale-[0.97] border border-gray-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy Link
        </button>
      </div>
    </div>
  );
}

export function ArticleLeadCapture({ postTitle }: { postTitle: string }) {
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
            message: `I read "${postTitle}" and want to learn more.`,
          },
        }),
      });
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 md:p-8 mb-12">
      <h3 className="text-[18px] font-black text-gray-900 mb-2">
        See this in action on your property
      </h3>
      <p className="text-[14px] text-gray-600 mb-4">
        15-minute call. No slide deck. We&apos;ll show you Attenda from every role — guest, staff, GM, partner — on your property.
      </p>
      {status === 'sent' ? (
        <div className="bg-white border border-teal-200 rounded-xl p-4 text-center">
          <p className="text-[15px] font-bold text-gray-900">We&apos;ll be in touch!</p>
          <p className="text-[12px] text-gray-500 mt-1">Expect a reply within one business day.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-teal-500 transition-colors bg-white"
          />
          <button
            onClick={handleSubmit}
            disabled={status === 'sending'}
            className="px-6 py-3 rounded-xl text-white font-bold text-[13px] bg-teal-600 hover:bg-teal-700 transition-all active:scale-[0.97] shadow-sm disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending...' : 'Get a Demo →'}
          </button>
        </div>
      )}
      <p className="text-[11px] text-gray-500 mt-3">
        Replies within 4 business hours. Your inquiry goes to support@attendaapp.com.
      </p>
    </div>
  );
}
