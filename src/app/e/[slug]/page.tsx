'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ExperienceViewer, { ExperienceBlock, LogKind } from '@/components/experience/ExperienceViewer';

// Public experience surface — /e/<slug>. No chrome. Elegant 404 when missing/unpublished.

export default function PublicExperiencePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [exp, setExp] = useState<{ title: string; subtitle: string | null; mode: 'interactive' | 'presentation' | 'hybrid'; blocks: ExperienceBlock[] } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'gone'>('loading');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/experience?public=1&slug=${encodeURIComponent(slug)}`);
        if (!r.ok) { setState('gone'); return; }
        const j = await r.json();
        if (!j?.experience) { setState('gone'); return; }
        setExp(j.experience);
        setState('ready');
      } catch {
        setState('gone');
      }
    })();
  }, [slug]);

  const onLog = (kind: LogKind, contact?: Record<string, string>, meta?: Record<string, unknown>) => {
    fetch('/api/experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log-event', slug, kind, contact, meta }),
    }).catch(() => {});
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#07231F' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: '#15b79e', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (state === 'gone' || !exp) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center" style={{ background: '#07231F' }}>
        <div>
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl" style={{ background: '#0B3B36' }} />
          <h1 className="text-xl font-extrabold text-white" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            This experience is no longer available
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#8FBCB5' }}>Check the link you received, or reach out to the Attenda team.</p>
        </div>
      </div>
    );
  }

  return <ExperienceViewer title={exp.title} subtitle={exp.subtitle} mode={exp.mode} blocks={exp.blocks || []} onLog={onLog} />;
}