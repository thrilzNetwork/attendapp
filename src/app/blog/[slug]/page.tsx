'use client';

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts, featuredBlogPosts } from "@/content/blog";
import { ArrowLeft } from "lucide-react";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = async () => {
    if (!email) return;
    setStatus('sending');
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            message: `I read "${post.title}" and want to learn more.`,
          },
        }),
      });
      setStatus('sent');
    } catch {
      setStatus('idle');
    }
  };

  const relatedPosts = featuredBlogPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* Article */}
      <article className="max-w-2xl mx-auto px-5 py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-teal-600 hover:text-teal-700 mb-8"
        >
          <ArrowLeft size={14} /> Back to Field Notes
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-white"
            style={{ backgroundColor: post.categoryColor }}
          >
            {post.category}
          </span>
          <span className="text-[11px] text-gray-400">{post.readingTime}</span>
          <span className="text-[11px] text-gray-400">·</span>
          <span className="text-[11px] text-gray-400">{post.publishedDate}</span>
        </div>

        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight text-gray-900 mb-3 leading-tight">
          {post.title}
        </h1>
        <p className="text-[17px] text-gray-600 leading-relaxed mb-8">
          {post.subtitle}
        </p>

        <div className="border-t border-gray-200 pt-6 mb-10">
          <div className="flex items-center gap-3 text-[13px] text-gray-500 mb-8">
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-[13px] font-black">
              AS
            </div>
            <div>
              <span className="font-bold text-gray-900">Alejandro Soria</span>
              <span className="ml-2">Founder · Attenda</span>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            {post.content.map((paragraph: string, i: number) => (
              <p
                key={i}
                className="text-[16px] text-gray-700 leading-[1.8] mb-5"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* In-article Lead Capture */}
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
            Replies within 4 business hours. Your inquiry goes to thrilznetwork@gmail.com.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="text-center border-t border-gray-200 pt-8">
          <Link
            href="/blog"
            className="text-[13px] font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
          >
            ← Back to all Field Notes
          </Link>
        </div>
      </article>

      {/* Related Posts */}
      <section className="bg-gray-50 border-t border-gray-200 py-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-[18px] font-black text-gray-900 mb-6 text-center">
            More Field Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={`/blog/${rp.slug}`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase text-white mb-2"
                  style={{ backgroundColor: rp.categoryColor }}
                >
                  {rp.category}
                </span>
                <h4 className="text-[15px] font-black text-gray-900 mb-1 leading-snug">
                  {rp.title}
                </h4>
                <p className="text-[12px] text-gray-600 line-clamp-2">
                  {rp.problem}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-5 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-600">
                <span className="text-white font-black text-[12px]">A</span>
              </div>
              <span className="text-[13px] text-gray-600">Attenda</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/blog" className="hover:text-gray-900">Blog</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <a href="mailto:thrilznetwork@gmail.com" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}