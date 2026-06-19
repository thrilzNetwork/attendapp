'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowLeft, Building2, User, Phone, Mail, AlignLeft, Store } from 'lucide-react';
import { getHotelConfig } from '@/lib/supabase';

const TEAL = '#0D9488';

function ApplyContent() {
  const searchParams = useSearchParams();
  const hotelParam = searchParams.get('hotel') || '';

  const [hotelName, setHotelName] = useState('');
  const [brandColor, setBrandColor] = useState(TEAL);
  const [loadingHotel, setLoadingHotel] = useState(!!hotelParam);

  // Form state
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [hotelField, setHotelField] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotelParam) { setLoadingHotel(false); return; }
    getHotelConfig(hotelParam).then(cfg => {
      if (cfg) {
        setHotelName(cfg.name);
        if (cfg.brandColor) setBrandColor(cfg.brandColor);
      }
      setLoadingHotel(false);
    });
  }, [hotelParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/partner-apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-key': process.env.NEXT_PUBLIC_SUPERADMIN_API_KEY || '',
        },
        body: JSON.stringify({
          name,
          contact,
          phone,
          email,
          hotel: hotelParam || hotelField,
          message: description,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingHotel) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-[#F4F4F5]">
        <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
      </div>
    );
  }

  const headline = hotelName ? `Partner with ${hotelName}` : 'Become a Partner';
  const color = brandColor;

  if (submitted) {
    return (
      <div className="min-h-dvh w-full bg-[#F4F4F5] flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${color}20` }}>
            <CheckCircle size={36} style={{ color }} />
          </div>
          <h2 className="text-[22px] font-bold text-black mb-2">Application Received!</h2>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-1">
            Thanks, <span className="font-semibold text-black">{contact}</span>! We&apos;ve received your application for{' '}
            <span className="font-semibold text-black">{name}</span>.
          </p>
          {hotelName ? (
            <p className="text-[13px] text-gray-400 mt-1">
              Our team at <span className="font-semibold">{hotelName}</span> will be in touch within 1–2 business days.
            </p>
          ) : (
            <p className="text-[13px] text-gray-400 mt-1">
              Our team will review your application and be in touch within 1–2 business days.
            </p>
          )}
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 active:scale-95 flex items-center gap-2"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-[#F4F4F5]">
      {/* Hero banner */}
      <div
        className="w-full px-5 pt-12 pb-10"
        style={{ background: `linear-gradient(135deg, ${color} 0%, #10b981 100%)` }}
      >
        <div className="max-w-md mx-auto">
          <h1 className="text-[26px] font-bold text-white leading-tight mb-2">{headline}</h1>
          <p className="text-[14px] text-white/80 mb-6">
            Join our network and start reaching hotel guests today.
          </p>
          {/* Value props */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🎯', label: 'Reach hotel guests directly' },
              { icon: '💸', label: 'Only 10% commission\nvs 35% elsewhere' },
              { icon: '🚀', label: 'No setup fees, ever' },
            ].map((v) => (
              <div key={v.label} className="bg-white/15 rounded-2xl p-3 text-center">
                <div className="text-[20px] mb-1">{v.icon}</div>
                <p className="text-[10px] font-semibold text-white leading-tight whitespace-pre-line">{v.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="px-5 pb-10 -mt-4 max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[17px] font-bold text-black mb-5">Tell us about your business</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business name */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Business / Restaurant Name *
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                <Store size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Bella Italia Restaurant"
                  className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Contact name */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Contact Name *
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                <User size={15} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Your full name"
                  className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Phone Number *
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                <Phone size={15} className="text-gray-400 shrink-0" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (305) 555-0100"
                  className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Email Address *
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                <Mail size={15} className="text-gray-400 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Brief Description{' '}
                <span className="text-gray-300 normal-case font-normal">(optional)</span>
              </label>
              <div className="flex items-start gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                <AlignLeft size={15} className="text-gray-400 shrink-0 mt-0.5" />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What kind of cuisine or service do you offer?"
                  rows={3}
                  className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent resize-none"
                />
              </div>
            </div>

            {/* Hotel field — only shown when no slug in URL */}
            {!hotelParam && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Hotel / Property{' '}
                  <span className="text-gray-300 normal-case font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-teal-500 transition-colors">
                  <Building2 size={15} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={hotelField}
                    onChange={e => setHotelField(e.target.value)}
                    placeholder="e.g. Miami Airport Marriott"
                    className="flex-1 text-[14px] text-black placeholder:text-gray-300 outline-none bg-transparent"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-white text-[15px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60 mt-2"
              style={{ backgroundColor: color }}
            >
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>

            <p className="text-center text-[11px] text-gray-400 pt-1">
              By submitting, you agree to be contacted by our partnership team.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="h-dvh w-full flex items-center justify-center bg-[#F4F4F5]">
        <div className="w-7 h-7 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: TEAL }} />
      </div>
    }>
      <ApplyContent />
    </Suspense>
  );
}
