'use client';

/* Demo tenant — LANDING page (/serve/demo/<id>).
   Their brand, their products, Attenda Serve footer. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Check, RefreshCw } from 'lucide-react';
import {
  loadDraft, type DemoDraft,
} from '@/components/serve/serve-demo-store';
import { DemoSwitcher, TrialBar, demoTokens as T, demoShadow } from '@/components/serve/serve-demo-chrome';

export default function DemoLandingPage() {
  const [draft, setDraft] = useState<DemoDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = window.location.pathname.split('/')[3] || '';
    setDraft(loadDraft(id));
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <div className="min-h-screen" style={{ backgroundColor: T.CREAM }} />;
  }

  if (!draft) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: T.CREAM, color: T.INK }}>
        <h1 className="text-[24px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Demo no encontrada</h1>
        <p className="mt-2 text-[14px] font-medium" style={{ color: '#5a6168' }}>Esta demo expiró o no existe.</p>
        <Link href="/serve/demo" className="mt-6 rounded-xl border-2 px-6 py-3.5 text-[15px] font-black"
          style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: demoShadow }}>
          Crear una nueva demo
        </Link>
      </div>
    );
  }

  const initials = draft.name.slice(0, 2).toUpperCase();
  const shown = draft.products.filter((p) => p.available !== false).slice(0, 6);

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: T.CREAM, color: T.INK, ['--sv-ink' as string]: T.INK }}>
      <TrialBar createdAt={draft.createdAt} />

      {/* nav */}
      <header className="sticky top-0 z-40 border-b-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {draft.logo
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.logo} alt="" className="h-8 w-8 rounded-lg border-2 object-contain" style={{ borderColor: T.INK, backgroundColor: '#fff' }} />
              : <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 text-[12px] font-black" style={{ borderColor: T.INK, backgroundColor: T.TEAL }}>{initials}</span>}
            <span className="text-[16px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>{draft.name}</span>
          </div>
          <Link href={`/serve/demo/${draft.id}/app`}
            className="rounded-xl border-2 px-4 py-2 text-[13px] font-black"
            style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)' }}>
            Pedir ahora
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="border-b-2" style={{ borderColor: T.INK, backgroundColor: T.PAPER }}>
        <div className="mx-auto max-w-3xl px-4 py-12 text-center md:py-16">
          {draft.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.logo} alt="" className="mx-auto h-20 w-20 rounded-2xl border-2 object-contain p-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }} />
          )}
          <h1 className="mt-5 text-[32px] font-black leading-tight md:text-[48px]" style={{ fontFamily: 'Archivo, sans-serif' }}>
            {draft.name}
          </h1>
          <p className="mt-3 text-[15px] font-medium" style={{ color: '#5a6168' }}>
            {draft.tagline || `${draft.type}${draft.city ? ` · ${draft.city}` : ''} — pedidos online, directo a nuestro WhatsApp.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/serve/demo/${draft.id}/app`}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-black border-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ backgroundColor: T.TEAL, color: T.INK, borderColor: T.INK, boxShadow: `5px 5px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
              <ShoppingBag size={17} /> Ver menú y pedir
            </Link>
            <Link href={`/serve/demo/${draft.id}/admin`}
              className="rounded-xl border-2 px-6 py-3.5 text-[14px] font-black"
              style={{ backgroundColor: T.PAPER, borderColor: T.INK }}>
              Ver panel del negocio
            </Link>
          </div>
        </div>
      </section>

      {/* products */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-[22px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Lo más pedido</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shown.map((p, i) => (
            <div key={i} className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
              <div className="text-[15px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>{p.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[17px] font-black" style={{ color: T.TEAL_INK }}>S/ {p.price.toFixed(2)}</span>
                <Link href={`/serve/demo/${draft.id}/app`} className="inline-flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide" style={{ color: T.TEAL_INK }}>
                  Pedir <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* cómo funciona */}
      <section className="border-y-2" style={{ borderColor: T.INK, backgroundColor: T.NAVY }}>
        <div className="mx-auto max-w-3xl px-4 py-12 text-white">
          <h2 className="text-center text-[22px] font-black md:text-[28px]" style={{ fontFamily: 'Archivo, sans-serif' }}>Cómo funciona</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { n: '1', t: 'Eliges del menú', d: 'Arma tu pedido en segundos, sin llamadas.' },
              { n: '2', t: 'Confirmas por WhatsApp', d: 'Tu pedido llega listo al equipo.' },
              { n: '3', t: 'Lo recibes', d: 'Retiro en tienda o delivery.' },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border-2 p-5" style={{ backgroundColor: T.CREAM, borderColor: T.INK, color: T.INK, boxShadow: demoShadow }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 text-[14px] font-black" style={{ backgroundColor: T.TEAL, borderColor: T.INK }}>{s.n}</span>
                <h3 className="mt-3 text-[14px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>{s.t}</h3>
                <p className="mt-1 text-[12.5px] font-medium" style={{ color: '#5a6168' }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* attenda footer */}
      <footer className="border-t-2 pb-28" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider"
            style={{ borderColor: T.INK, fontFamily: 'IBM Plex Mono, monospace', backgroundColor: T.PAPER }}>
            <Check size={13} strokeWidth={3} style={{ color: T.TEAL_INK }} /> Demo creada con Attenda Serve · 0% comisión
          </div>
          <Link href="/serve/demo"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-black border-2"
            style={{ backgroundColor: T.INK, color: '#F3F0E6', borderColor: T.INK, boxShadow: `4px 4px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
            Activar mi negocio <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-[11px] font-medium" style={{ color: '#5a6168' }}>
            <RefreshCw size={11} className="mr-1 inline" />
            Esta es una demo de 24 horas con datos de prueba.
          </p>
        </div>
      </footer>

      <DemoSwitcher demoId={draft.id} mode="landing" />
    </div>
  );
}