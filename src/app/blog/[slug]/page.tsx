import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/content/blog";
import { ArrowLeft } from "lucide-react";
import { ShareBar, ArticleLeadCapture } from "@/components/blog/PostInteractive";

const CANONICAL = "https://attendaapp.com";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};

  const url = `${CANONICAL}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: url },
    authors: [{ name: post.author, url: CANONICAL }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.metaDescription,
      url,
      publishedTime: post.publishedDate,
      authors: [post.author],
      section: post.category,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: ["/og-image.png"],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const url = `${CANONICAL}/blog/${post.slug}`;
  const relatedPosts = blogPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);
  const fillerPosts = blogPosts
    .filter((p) => p.slug !== post.slug && !relatedPosts.includes(p))
    .slice(0, 3 - relatedPosts.length);
  const shown = [...relatedPosts, ...fillerPosts];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image: `${CANONICAL}/og-image.png`,
    datePublished: post.publishedDate,
    dateModified: post.publishedDate,
    author: { "@type": "Person", name: post.author, url: CANONICAL },
    publisher: {
      "@type": "Organization",
      name: "Attenda",
      logo: { "@type": "ImageObject", url: `${CANONICAL}/og-image.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: post.category,
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

        <ShareBar />
        <ArticleLeadCapture postTitle={post.title} />

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
            {shown.map((rp) => (
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
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/icon-mark.svg" alt="Attenda" style={{ height: 28, width: 'auto' }} />
              <span className="text-[13px] text-gray-600">Attenda</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-gray-500">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <Link href="/blog" className="hover:text-gray-900">Blog</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy</Link>
            <a href="https://www.linkedin.com/company/thrilz-media" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">LinkedIn</a>
            <a href="mailto:support@attendaapp.com" className="hover:text-gray-900">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
