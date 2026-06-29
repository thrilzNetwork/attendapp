'use client';

import { useState } from "react";
import Link from "next/link";
import { featuredBlogPosts } from "@/content/blog";
import { ArrowRight } from "lucide-react";

export default function BlogIndexPage() {
  const posts = featuredBlogPosts;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* Hero */}
      <section className="py-20 px-5 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-2xl mx-auto text-center">
          <Link href="/" className="text-[12px] font-bold text-teal-600 hover:text-teal-700 mb-4 block">
            ← Back to Attenda
          </Link>
          <h1 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">
            Field Notes
          </h1>
          <h2 className="text-[34px] md:text-[44px] font-black tracking-tight text-gray-900 mb-4 leading-[1.05]">
            For Independent Hotel Operators
          </h2>
          <p className="text-[16px] md:text-[18px] text-gray-600 max-w-xl mx-auto">
            Real writing from fifteen years on the front desk. No fake authors. No invented quotes. Just the six topics every operator faces — with real numbers from the properties running Attenda.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-gray-500">
            <span className="font-bold text-gray-900">Alejandro Soria</span>
            <span>·</span>
            <span>15 yrs hospitality</span>
            <span>·</span>
            <span>Updated weekly</span>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16 px-5 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-3 right-4 text-[64px] font-black text-gray-100 leading-none pointer-events-none select-none">
                {post.num}
              </div>
              <div className="flex items-center justify-between mb-3 relative">
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white"
                  style={{ backgroundColor: post.categoryColor }}
                >
                  {post.category}
                </span>
                <span className="text-[10px] text-gray-400 font-semibold">{post.readingTime}</span>
              </div>
              <h3 className="text-[18px] font-black text-gray-900 mb-2 leading-tight group-hover:text-gray-700 relative">
                {post.title}
              </h3>
              <p className="text-[13px] text-gray-600 leading-relaxed mb-5 flex-1 relative">
                {post.problem}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 relative">
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
                  By Alejandro Soria
                </div>
                <div className="text-[11px] font-bold flex items-center gap-1 text-teal-600">
                  Read the breakdown
                  <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Share bar */}
      <section className="py-10 px-5 border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-[13px] text-gray-600">
              <span className="font-semibold text-gray-900">Field Notes</span> — written by Alejandro Soria from fifteen years in hospitality
            </div>
            <button
              onClick={() => {
                const url = window.location.href;
                window.location.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
              Share Field Notes
            </button>
          </div>
        </div>
      </section>

      {/* Lead Capture */}
      <section className="py-16 px-5 bg-gray-50 border-t border-gray-200">
        <div className="max-w-xl mx-auto text-center">
          <h3 className="text-[22px] font-black text-gray-900 mb-3">See Attenda on your property</h3>
          <p className="text-[14px] text-gray-600 mb-6">
            15-minute call. No slide deck. Drop your email and we&apos;ll show you the platform from every role.
          </p>
          <DemoForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-5 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/brand/icon-mark.svg" alt="Attenda" style={{ height: 28, width: 'auto' }} />
            <span className="text-[13px] text-gray-600">Attenda — Field Notes</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-900">Terms</Link>
            <a href="mailto:thrilznetwork@gmail.com" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Lead capture form ── */
function DemoForm() {
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