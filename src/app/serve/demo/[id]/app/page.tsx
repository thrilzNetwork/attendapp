'use client';

/* Attenda Serve — tenant ORDERING APP (/serve/demo/<id>/app).
   FV loop, server-backed: menu from API, cart, checkout → POST order
   (server prices it, saves it, returns waLink) → receipt auto-opens
   WhatsApp → 'Seguir pidiendo' back to menu. */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import { DemoSwitcher, demoTokens as T, demoShadow, demoShadowSm } from '@/components/serve/serve-demo-chrome';

type TenantData = {
  tenant: { id: string; name: string; type: string; city: string; phone: string; logo: string | null; tagline: string };
  menu: { slug: string; name: string; price: number; short?: string }[];
  open: boolean;
};

type Cart = Record<string, number>; // slug → qty

export default function DemoAppPage() {
  const [data, setData] = useState<TenantData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [showCart, setShowCart] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState<{ number: string; total: number; items: { name: string; qty: number; price: number }[]; waLink: string | null } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const id = window.location.pathname.split('/')[3] || '';
    fetch(`/api/serve/${id}`)
      .then(async (r) => {
        if (r.status === 404) { setMissing(true); return; }
        const j = await r.json();
        if (j?.ok) setData(j); else setMissing(true);
      })
      .catch(() => setMissing(true))
      .finally(() => setLoaded(true));
  }, []);

  const items = useMemo(() => {
    if (!data) return [];
    return Object.entries(cart)
      .map(([slug, qty]) => ({ p: data.menu.find((m) => m.slug === slug)!, qty }))
      .filter((x) => x.p && x.qty > 0);
  }, [cart, data]);

  const total = useMemo(() => items.reduce((a, x) => a + x.p.price * x.qty, 0), [items]);
  const count = useMemo(() => items.reduce((a, x) => a + x.qty, 0), [items]);

  if (!loaded) return <div className="min-h-screen" style={{ backgroundColor: T.CREAM }} />;

  if (missing || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: T.CREAM, color: T.INK }}>
        <h1 className="text-[24px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Demo no encontrada</h1>
        <Link href="/serve/demo" className="mt-6 rounded-xl border-2 px-6 py-3.5 text-[15px] font-black"
          style={{ backgroundColor: T.TEAL, borderColor: T.INK, boxShadow: demoShadow }}>Crear una nueva demo</Link>
      </div>
    );
  }

  const { tenant, menu, open } = data;
  const initials = tenant.name.slice(0, 2).toUpperCase();

  const add = (slug: string) => setCart((c) => ({ ...c, [slug]: (c[slug] || 0) + 1 }));
  const sub = (slug: string) => setCart((c) => {
    const q = (c[slug] || 0) - 1;
    const n = { ...c };
    if (q <= 0) delete n[slug]; else n[slug] = q;
    return n;
  });

  const checkout = async () => {
    if (!items.length || confirming) return;
    setConfirming(true);
    setErr('');
    try {
      const res = await fetch(`/api/serve/${tenant.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((x) => ({ slug: x.p.slug, qty: x.qty })),
          payment: 'YAPE',
          customerName: 'Cliente demo',
          customerPhone: '',
        }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'No se pudo enviar el pedido');
      setReceipt({ number: j.order.number, total: j.order.total, items: items.map((x) => ({ name: x.p.name, qty: x.qty, price: x.p.price })), waLink: j.waLink });
      setCart({});
      setShowCart(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: T.CREAM, color: T.INK, ['--sv-ink' as string]: T.INK }}>
      <header className="sticky top-0 z-40 border-b-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          {tenant.logo
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo} alt="" className="h-8 w-8 rounded-lg border-2 object-contain" style={{ borderColor: T.INK, backgroundColor: '#fff' }} />
            : <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 text-[12px] font-black" style={{ borderColor: T.INK, backgroundColor: T.TEAL }}>{initials}</span>}
          <div className="flex-1">
            <div className="text-[15px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>{tenant.name}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Mono, monospace', color: T.TEAL_INK }}>Pedido online</div>
          </div>
          <button onClick={() => setShowCart(true)} className="relative rounded-xl border-2 px-3 py-2" style={{ borderColor: T.INK, backgroundColor: T.PAPER }}>
            <ShoppingBag size={17} />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black"
                style={{ backgroundColor: T.TEAL, border: `2px solid ${T.INK}` }}>{count}</span>
            )}
          </button>
        </div>
      </header>

      {receipt ? (
        <div className="mx-auto max-w-xl px-4 py-14 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2" style={{ backgroundColor: T.TEAL, borderColor: T.INK }}>
            <Check size={30} strokeWidth={3} />
          </span>
          <h1 className="mt-5 text-[26px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>¡Pedido {receipt.number.replace('TP-', '#')} enviado!</h1>
          <p className="mt-2 text-[14px] font-medium" style={{ color: '#5a6168' }}>
            {receipt.waLink ? 'Se abrió WhatsApp con tu pedido — solo presiona enviar.' : 'El negocio recibió tu pedido en su panel.'}
          </p>
          <div className="mt-6 rounded-2xl border-2 p-5 text-left" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadow }}>
            {receipt.items.map((it, i) => (
              <div key={i} className="mt-2 flex justify-between text-[14px] font-medium">
                <span>{it.qty}x {it.name}</span><span className="font-bold">S/ {(it.qty * it.price).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-3 border-t-2 pt-3 font-black" style={{ borderColor: T.INK }}>
              <div className="flex justify-between"><span>TOTAL</span><span>S/ {receipt.total.toFixed(2)}</span></div>
            </div>
          </div>
          {receipt.waLink && (
            <a href={receipt.waLink} target="_blank" rel="noreferrer"
              className="mt-5 block w-full rounded-xl border-2 py-4 text-[16px] font-black"
              style={{ backgroundColor: '#25D366', color: T.INK, borderColor: T.INK, boxShadow: `5px 5px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
              Abrir WhatsApp
            </a>
          )}
          <button onClick={() => setReceipt(null)}
            className="mt-4 w-full rounded-xl border-2 py-4 text-[16px] font-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: `5px 5px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
            Seguir pidiendo
          </button>
          <p className="mt-4 text-[12px] font-medium" style={{ color: '#5a6168' }}>
            Mira tu pedido en el panel del negocio → <Link href={`/serve/demo/${tenant.id}/admin`} className="font-black underline">Admin</Link>
          </p>
        </div>
      ) : (
        <>
          <main className="mx-auto max-w-xl px-4 py-6 pb-32">
            {!open && (
              <div className="mb-4 rounded-xl border-2 px-4 py-3 text-center text-[13px] font-extrabold" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
                Cerrado ahora — puedes ver el menú, pero el negocio no está recibiendo pedidos.
              </div>
            )}
            <h1 className="text-[20px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Menú</h1>
            <div className="mt-4 space-y-3">
              {menu.map((p) => {
                const qty = cart[p.slug] || 0;
                return (
                  <div key={p.slug} className="flex items-center gap-3 rounded-2xl border-2 p-4" style={{ backgroundColor: T.PAPER, borderColor: T.INK, boxShadow: demoShadowSm }}>
                    <div className="flex-1">
                      <div className="text-[15px] font-extrabold" style={{ fontFamily: 'Archivo, sans-serif' }}>{p.name}</div>
                      <div className="mt-0.5 text-[14px] font-black" style={{ color: T.TEAL_INK }}>S/ {p.price.toFixed(2)}</div>
                    </div>
                    {qty === 0 ? (
                      <button onClick={() => add(p.slug)}
                        className="rounded-xl border-2 px-4 py-2.5 text-[12px] font-black uppercase tracking-wide active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                        style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)' }}>
                        Agregar
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border-2 px-2 py-1.5" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}>
                        <button onClick={() => sub(p.slug)} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: `2px solid ${T.INK}`, backgroundColor: T.PAPER }}><Minus size={13} /></button>
                        <span className="w-6 text-center text-[14px] font-black">{qty}</span>
                        <button onClick={() => add(p.slug)} className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ border: `2px solid ${T.INK}`, backgroundColor: T.TEAL }}><Plus size={13} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
              {menu.length === 0 && (
                <p className="rounded-2xl border-2 p-6 text-center text-[13px] font-medium" style={{ borderColor: T.INK, backgroundColor: T.PAPER, color: '#5a6168' }}>
                  Aún no hay productos en el menú.
                </p>
              )}
            </div>
          </main>

          {count > 0 && !showCart && (
            <div className="fixed inset-x-0 bottom-16 z-40 px-4">
              <div className="mx-auto max-w-xl">
                <button onClick={() => setShowCart(true)}
                  className="flex w-full items-center justify-between rounded-xl border-2 px-5 py-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: T.INK, color: '#F3F0E6', borderColor: T.INK, boxShadow: `4px 4px 0 ${T.TEAL}`, fontFamily: 'Archivo, sans-serif' }}>
                  <span className="text-[13px] font-extrabold">{count} {count === 1 ? 'ítem' : 'ítems'} · S/ {total.toFixed(2)}</span>
                  <span className="text-[14px] font-black">Ver pedido <ArrowLeft size={15} className="inline rotate-180" /></span>
                </button>
              </div>
            </div>
          )}

          {showCart && (
            <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(21,32,43,0.55)' }} onClick={() => setShowCart(false)}>
              <div className="mx-auto w-full max-w-xl rounded-t-3xl border-2 border-b-0 p-5 pb-24" style={{ backgroundColor: T.CREAM, borderColor: T.INK }} onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full" style={{ backgroundColor: T.INK, opacity: 0.3 }} />
                <h2 className="text-[18px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Tu pedido</h2>
                <div className="mt-3 space-y-2">
                  {items.map((x) => (
                    <div key={x.p.slug} className="flex items-center gap-3 rounded-xl border-2 p-3" style={{ backgroundColor: T.PAPER, borderColor: T.INK }}>
                      <div className="flex-1">
                        <div className="text-[14px] font-extrabold">{x.p.name}</div>
                        <div className="text-[12px] font-bold" style={{ color: '#5a6168' }}>S/ {x.p.price.toFixed(2)} c/u</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => sub(x.p.slug)} className="flex h-7 w-7 items-center justify-center rounded-lg border-2" style={{ borderColor: T.INK, backgroundColor: T.CREAM }}><Minus size={13} /></button>
                        <span className="w-5 text-center text-[13px] font-black">{x.qty}</span>
                        <button onClick={() => add(x.p.slug)} className="flex h-7 w-7 items-center justify-center rounded-lg border-2" style={{ borderColor: T.INK, backgroundColor: T.TEAL }}><Plus size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between border-t-2 pt-4 text-[16px] font-black" style={{ borderColor: T.INK }}>
                  <span>Total</span><span>S/ {total.toFixed(2)}</span>
                </div>
                <button disabled={!items.length || confirming || !open} onClick={checkout}
                  className="mt-4 w-full rounded-xl border-2 py-4 text-[16px] font-black disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  style={{ backgroundColor: T.TEAL, borderColor: T.INK, color: T.INK, boxShadow: `5px 5px 0 ${T.TEAL_INK}`, fontFamily: 'Archivo, sans-serif' }}>
                  {confirming ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
                </button>
                {err && <p className="mt-3 text-center text-[13px] font-bold" style={{ color: '#B4231F' }}>{err}</p>}
              </div>
            </div>
          )}
        </>
      )}

      <DemoSwitcher demoId={tenant.id} mode="app" />
    </div>
  );
}