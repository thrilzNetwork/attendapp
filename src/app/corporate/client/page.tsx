'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users, BedDouble, TrendingUp } from 'lucide-react';

const TEAL = '#158A7C';
const TEAL_BRIGHT = '#15b79e';

type Snapshot = {
  me: { name: string | null; title: string | null; positions: string[] };
  client: { slug: string; name: string; brand: string | null; rooms: number | null; address: string | null; notes: string | null; status: string };
  team: { name: string; title: string | null; positions: string[] }[];
  propertyStaff: number | null;
  activity: {
    last7: number; done30: number; pending30: number; inProgress30: number;
    openNow: number; byType: { type: string; count: number }[];
  } | null;
  goals: { position_key: string; position_title: string; name: string; target: string; unit: string; detail: string }[];
  productivity: { score: number; done: number; total: number } | null;
  growthPath: { key: string; title: string; description: string | null; color: string; responsibilities: { title: string; detail: string }[] }[];
};

function Section({ n, title, hint, children, dark }: { n: string; title: string; hint?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className="rounded-2xl p-5 shadow-sm" style={dark
      ? { background: 'linear-gradient(135deg, #0B3B36 0%, #07231F 100%)' }
      : { background: '#fff', border: '1px solid rgba(21,138,124,0.10)' }}>
      <div className="flex items-baseline gap-2.5">
        <span className="text-[11px] font-bold tracking-widest" style={{ color: dark ? TEAL_BRIGHT : TEAL }}>{n}</span>
        <h3 className="text-sm font-bold" style={{ color: dark ? '#E8F4F1' : '#111827' }}>{title}</h3>
        {hint && <span className="text-[11px]" style={{ color: dark ? 'rgba(232,244,241,0.45)' : '#9ca3af' }}>{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ClientSnapshotPage() {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [clients, setClients] = useState<{ slug: string; name: string }[]>([]);
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { router.replace('/corporate'); return; }
      const meRes = await fetch('/api/corporate/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!meRes.ok) { router.replace('/corporate'); return; }
      const me = await meRes.json();
      const list: { slug: string; name: string }[] = (me.assignments || []).map((a: any) => ({
        slug: a.corporate_clients?.slug || '',
        name: a.corporate_clients?.name || 'Client',
      })).filter((c: any) => c.slug);

      // Super admins can walk through every client — merge the full list in.
      try {
        const pr = await fetch('/api/corporate/pitch-links', { headers: { Authorization: `Bearer ${token}` } });
        if (pr.ok) {
          const pj = await pr.json();
          const seen = new Set(list.map((x) => x.slug));
          for (const cl of (pj.clients || []) as { slug: string; name: string }[]) {
            if (cl.slug && !seen.has(cl.slug)) { list.push({ slug: cl.slug, name: cl.name }); seen.add(cl.slug); }
          }
        }
      } catch { /* non-super admins keep assignments only */ }

      setClients(list);
      const wanted = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('slug') : null;
      if (wanted) setSlug(wanted);
      else if (list.length > 0) setSlug(list[0].slug);
      else setLoading(false);
    })();
  }, [router]);

  const load = useCallback(async (s: string) => {
    if (!s) return;
    setLoading(true);
    setError('');
    const { data: sess } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { router.replace('/corporate'); return; }
    const res = await fetch(`/api/corporate/client-snapshot?slug=${encodeURIComponent(s)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Could not load this client snapshot.');
      setSnap(null);
    } else {
      setSnap(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (slug) load(slug); }, [slug, load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6FAF9]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (error || !snap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6FAF9] px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">{error || 'No data'}</p>
        <a href="/corporate/my-day" className="mt-6 rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: TEAL }}>Back to My Day</a>
      </div>
    );
  }

  const c = snap.client;
  const act = snap.activity;
  const prod = snap.productivity;
  const singleClient = clients.length <= 1;

  return (
    <div className="min-h-screen bg-[#F6FAF9]">
      {/* header */}
      <div className="sticky top-0 z-20 border-b border-teal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TEAL }}>Attenda Corporate</div>
              <div className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>Client Snapshot</div>
            </div>
            <a href="/corporate/my-day" className="rounded-xl px-3.5 py-1.5 text-xs font-bold" style={{ background: '#F6FAF9', color: TEAL }}>← My Day</a>
          </div>
          {!singleClient && (
            <div className="mt-3 flex flex-wrap gap-2">
              {clients.map((cl) => (
                <button key={cl.slug} onClick={() => setSlug(cl.slug)}
                  className="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
                  style={slug === cl.slug ? { background: TEAL, color: '#fff' } : { background: '#f1f5f9', color: '#64748b' }}>
                  {cl.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">

        {/* 01 — the property */}
        <Section n="01" title="The property you'd be supporting">
          <h2 className="text-2xl font-bold text-gray-900">{c.name}</h2>
          <div className="mt-1 text-xs text-gray-500">{c.brand ? `${c.brand} · ` : ''}{c.address || 'Address on file'}</div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-[#F6FAF9] px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <BedDouble className="h-3.5 w-3.5" style={{ color: TEAL }} /> {c.rooms ?? '—'} rooms
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
              <Users className="h-3.5 w-3.5" style={{ color: TEAL }} /> {snap.propertyStaff ?? '—'} property staff
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: TEAL }}>
              <TrendingUp className="h-3.5 w-3.5" /> {snap.team.length} on the Attenda team
            </span>
          </div>
          {c.notes && <p className="mt-3 border-l-2 pl-3 text-xs italic leading-relaxed text-gray-500" style={{ borderColor: TEAL_BRIGHT }}>{c.notes}</p>}
        </Section>

        {/* 02 — this week */}
        <Section n="02" title="What guests asked for" hint="live numbers">
          {act ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#F6FAF9] py-4">
                <div className="text-3xl font-extrabold text-gray-900">{act.last7}</div>
                <div className="mt-1 text-[10px] font-semibold text-gray-400">requests this week</div>
              </div>
              <div className="rounded-xl py-4" style={{ background: 'rgba(21,183,158,0.10)' }}>
                <div className="text-3xl font-extrabold" style={{ color: TEAL }}>{act.done30}</div>
                <div className="mt-1 text-[10px] font-semibold text-gray-400">completed · 30 days</div>
              </div>
              <div className="rounded-xl py-4" style={{ background: act.openNow > 0 ? 'rgba(217,119,6,0.10)' : 'rgba(21,183,158,0.10)' }}>
                <div className="text-3xl font-extrabold" style={{ color: act.openNow > 0 ? '#d97706' : TEAL }}>{act.openNow}</div>
                <div className="mt-1 text-[10px] font-semibold text-gray-400">open right now</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Live numbers appear once this client is connected to the platform.</p>
          )}
        </Section>

        {/* 03 — how we're doing */}
        <Section n="03" title="How we're doing" hint="our productivity score">
          {prod ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold" style={{ color: prod.score >= 80 ? TEAL : prod.score >= 60 ? '#d97706' : '#dc2626' }}>{prod.score}</span>
                <span className="text-xl font-bold text-gray-300">/100</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${prod.score}%`, background: `linear-gradient(90deg, ${TEAL_BRIGHT}, ${TEAL})` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                We completed <b className="text-gray-800">{prod.done} of {prod.total}</b> guest requests in the last 30 days.
                This is the score we hold ourselves to — and it's the number you'll help push higher.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Score appears once this client is connected to the platform.</p>
          )}
        </Section>

        {/* 04 — needs attention (only when there is something) */}
        {act && act.openNow > 0 && (
          <Section n="04" title="What needs attention right now">
            <div className="space-y-2">
              {act.byType.slice(0, 4).map((t) => (
                <div key={t.type} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
                  <span className="text-xs font-bold capitalize text-amber-900">{t.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-bold text-amber-700">{t.count} open</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-gray-400">This is the list you'd jump on each morning — clear it, and the score goes up.</p>
          </Section>
        )}

        {/* 05 — your team */}
        <Section n={act && act.openNow > 0 ? '05' : '04'} title="Your team here">
          <div className="grid gap-2 sm:grid-cols-2">
            {snap.team.map((m, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-[#F6FAF9] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: TEAL }}>
                  {(m.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{m.name}</div>
                  <div className="text-[11px] text-gray-400">{m.title || m.positions.join(', ') || 'Team member'}</div>
                </div>
              </div>
            ))}
            {!snap.team.length && <div className="text-xs text-gray-400">Just you for now — as the property grows, so does the team.</div>}
          </div>
        </Section>

        {/* 06 — goals */}
        <Section n={act && act.openNow > 0 ? '06' : '05'} title="What success looks like" hint="your goals">
          <div className="space-y-2">
            {snap.goals.map((g, i) => (
              <div key={i} className="rounded-xl bg-[#F6FAF9] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{g.name}</span>
                  <span className="text-[11px] font-bold" style={{ color: TEAL }}>{g.target} {g.unit}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-gray-400">{g.position_title} · {g.detail}</div>
              </div>
            ))}
            {!snap.goals.length && <div className="text-xs text-gray-400">Goals get set with you in your first week.</div>}
          </div>
        </Section>

        {/* 07 — growth path */}
        <Section n={act && act.openNow > 0 ? '07' : '06'} title="Where you can go from here" hint="grow with us" dark>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,244,241,0.75)' }}>
            Your position is <b style={{ color: TEAL_BRIGHT }}>not a ceiling</b>. Every path below is open to you —
            master one, grow into the next. We promote from within.
          </p>
          <div className="mt-4 space-y-2.5">
            {snap.growthPath.map((p, i) => {
              const mine = snap.me.positions.includes(p.key);
              return (
                <div key={p.key} className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: mine ? 'rgba(21,183,158,0.18)' : 'rgba(232,244,241,0.06)', border: mine ? '1px solid rgba(21,183,158,0.4)' : '1px solid transparent' }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: p.color || TEAL }}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold" style={{ color: mine ? TEAL_BRIGHT : '#E8F4F1' }}>
                      {p.title}{mine && <span className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: TEAL_BRIGHT, color: '#07231F' }}>YOU ARE HERE</span>}
                    </div>
                    {p.description && <div className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'rgba(232,244,241,0.6)' }}>{p.description}</div>}
                    {p.responsibilities.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.responsibilities.map((r, j) => (
                          <span key={j} className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: 'rgba(232,244,241,0.1)', color: 'rgba(232,244,241,0.7)' }}>
                            {r.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

      </div>
    </div>
  );
}