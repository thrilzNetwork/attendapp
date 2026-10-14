'use client';

/* Attenda Serve — 3-step checkout wizard (/app/checkout, white-label).
   Step 1 PEDIDO: name, phone, notes, promo.
   Step 2 ENTREGA: delivery zone + address OR retiro; scheduled time if closed.
   Step 3 PAGO: S/ → Yape/Plin card + claim; other currencies → QR /
   transferencia card (same YAPE_PLIN server enum, display adapts); or cash.
   POSTs the order server-side; receipt = order tracker page.
   Colors + money from the tenant bundle. */

import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { useCart } from '@/components/serve/cart-context';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { FV, fmtHours } from '@/lib/serve/fv-tokens';
import { resolveTheme, ResolvedTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';

type Zone = { id: string; name: string; fee: number };

const STEPS = ['Pedido', 'Entrega', 'Pago'] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const id = (pathname.match(/\/serve\/demo\/([^/]+)\/app/) || [])[1] || '';
  const { data } = useTenant(id);
  const { lines, subtotal, clear } = useCart();

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const currency = ((data?.tenant.currency || 'S/') as CurrencyCode);
  const fmt = (cents: number) => formatMoney(cents, currency);
  const isPEN = currency === 'S/';
  const payLabel = isPEN ? 'Yape / Plin' : 'QR / Transferencia';

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [promo, setPromo] = useState('');
  const [modality, setModality] = useState<'delivery' | 'pickup'>('delivery');
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [reference, setReference] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [payment, setPayment] = useState<'YAPE_PLIN' | 'CASH'>('YAPE_PLIN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const settings = data?.settings;
  const open = data?.open ?? true;
  const zones: Zone[] = settings?.zones ?? [];
  const deliveryZones = useMemo(() => zones.filter((z) => z.id !== 'pickup'), [zones]);
  const pickupZone = zones.find((z) => z.id === 'pickup');
  const zone: Zone | null = modality === 'pickup' ? (pickupZone ?? null) : (zones.find((z) => z.id === zoneId) ?? deliveryZones[0] ?? null);
  const zoneFee = zone && zone.id !== 'pickup' ? zone.fee : 0;

  const promoValid = !!settings?.promoCode && promo.trim().toUpperCase() === settings.promoCode.toUpperCase();
  const discount = promoValid ? Math.min(settings?.promoDiscount ?? 0, subtotal) : 0;
  const total = Math.max(0, subtotal - discount) + zoneFee;

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ color: FV.cream50 }}>Cargando…</div>
      </div>
    );
  }
  if (lines.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
        <ServeHeader tenantName={data.tenant.name} logo={data.tenant.logo} tagline={data.tenant.tagline} theme={tenantTheme} currency={currency} />
        <div className="flex flex-col items-center gap-4 pt-32 text-center">
          <div className="text-sm" style={{ color: T.cream60 }}>Tu carrito está vacío.</div>
          <button onClick={() => router.push(`/serve/demo/${id}/app`)} className="rounded-full px-6 py-3 text-sm font-black" style={{ backgroundColor: T.orange, color: T.black }}>
            VER EL MENÚ
          </button>
        </div>
      </div>
    );
  }

  const canNext =
    step === 0
      ? firstName.trim().length >= 2 && phone.replace(/[^0-9]/g, '').length >= 6
      : step === 1
        ? modality === 'pickup' || (street.trim().length >= 5 && !!zone)
        : true;

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/serve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ slug: l.slug, qty: l.qty })),
          zoneId: modality === 'pickup' ? 'pickup' : zone?.id ?? null,
          payment,
          customer: { firstName, phone },
          address: modality === 'delivery' ? { street, apartment, reference } : null,
          notes: notes || undefined,
          scheduledFor: !open && scheduledFor ? scheduledFor : undefined,
          promoCode: promoValid ? promo.trim() : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error || 'No se pudo crear el pedido');
        setSubmitting(false);
        return;
      }
      clear();
      router.push(`/serve/demo/${id}/app/order/${body.order.number}`);
    } catch {
      setError('Error de conexión');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={data.tenant.name} logo={data.tenant.logo} tagline={data.tenant.tagline} theme={tenantTheme} currency={currency} />
      <div className="mx-auto max-w-xl px-4 pt-5">
        {/* step tabs */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 rounded-xl border px-3 py-2 text-center text-xs font-bold"
              style={{
                fontFamily: 'Fredoka, sans-serif',
                borderColor: i === step ? T.orange : T.line,
                backgroundColor: i < step ? T.orange10 : 'transparent',
                color: i <= step ? T.orange : T.cream50,
              }}
            >
              {i + 1}. {s.toUpperCase()}
            </div>
          ))}
        </div>

        {/* closed banner */}
        {!open && (
          <div className="mt-3 rounded-2xl px-4 py-3 text-xs" style={{ backgroundColor: T.orange10, border: `1px solid ${T.orange40}`, color: T.orange }}>
            Cerrado ahora · {fmtHours(settings!.hoursOpen)}–{fmtHours(settings!.hoursClose)}. Puedes programar tu pedido para la apertura.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {step === 0 && (
            <>
              <Field T={T} label="Nombre" value={firstName} onChange={setFirstName} placeholder="Tu nombre" />
              <Field T={T} label="WhatsApp / Teléfono" value={phone} onChange={setPhone} placeholder="999 999 999" />
              <Field T={T} label="Notas para el local (opcional)" value={notes} onChange={setNotes} placeholder="Sin cebolla, tocar el timbre…" textarea />
              <Field T={T} label={`Código promocional${settings?.promoCode ? ` (${settings.promoCode})` : ''}`} value={promo} onChange={setPromo} placeholder="PRIMERO" />
              {promo && !promoValid && <div className="text-xs" style={{ color: FV.red }}>Código no válido</div>}
              {promoValid && <div className="text-xs" style={{ color: T.green }}>Código aplicado: -{fmt(discount)}</div>}
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ModeBtn T={T} active={modality === 'delivery'} onClick={() => setModality('delivery')} title="Delivery" sub={`${settings?.etaMin ?? 25}-${settings?.etaMax ?? 35} min`} />
                <ModeBtn T={T} active={modality === 'pickup'} onClick={() => setModality('pickup')} title="Retiro en tienda" sub="Listo para recoger" />
              </div>
              {modality === 'delivery' && (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    {deliveryZones.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => setZoneId(z.id)}
                        className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                        style={{ borderColor: zone?.id === z.id ? T.orange : T.line, backgroundColor: T.panel, color: T.cream }}
                      >
                        <span className="font-semibold">{z.name}</span>
                        <span className="font-bold" style={{ color: T.orange }}>{fmt(z.fee)}</span>
                      </button>
                    ))}
                  </div>
                  <Field T={T} label="Dirección" value={street} onChange={setStreet} placeholder="Calle y número" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field T={T} label="Dpto / Interior (opcional)" value={apartment} onChange={setApartment} placeholder="Dpto 302" />
                    <Field T={T} label="Referencia" value={reference} onChange={setReference} placeholder="Portón negro" />
                  </div>
                </>
              )}
              {!open && (
                <Field T={T} label="Programar para (HH:MM)" value={scheduledFor} onChange={setScheduledFor} placeholder="19:30" />
              )}
            </>
          )}

          {step === 2 && (
            <>
              {payment === 'YAPE_PLIN' && (
                isPEN ? (
                  <div className="rounded-2xl p-4" style={{ backgroundColor: FV.yapeBg, border: `1px solid ${FV.yapeBorder}` }}>
                    <div className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: FV.yape }}>Yape / Plin</div>
                    <div className="mt-2 text-lg font-bold" style={{ color: T.cream }}>{data.settings.yapeNumber || '979 652 013'}</div>
                    <div className="text-xs" style={{ color: T.cream60 }}>{data.settings.yapeHolder || data.tenant.name}</div>
                    <div className="mt-1 text-xs" style={{ color: T.cream50 }}>Yapea el total y toca el botón — llega directo a nuestro WhatsApp.</div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-4" style={{ backgroundColor: T.orange10, border: `1px solid ${T.orange40}` }}>
                    <div className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: T.orange }}>QR / Transferencia</div>
                    <div className="mt-2 text-lg font-bold" style={{ color: T.cream }}>{data.settings.yapeNumber || 'Pide el número al confirmar'}</div>
                    <div className="text-xs" style={{ color: T.cream60 }}>{data.settings.yapeHolder || data.tenant.name}</div>
                    <div className="mt-1 text-xs" style={{ color: T.cream50 }}>Transfiere el total y toca el botón — llega directo a nuestro WhatsApp.</div>
                  </div>
                )
              )}
              <div className="grid grid-cols-2 gap-2">
                <ModeBtn T={T} active={payment === 'YAPE_PLIN'} onClick={() => setPayment('YAPE_PLIN')} title={payLabel} sub="Paga ahora" />
                <ModeBtn T={T} active={payment === 'CASH'} onClick={() => setPayment('CASH')} title="Efectivo" sub="Paga al recibir" />
              </div>
              <SummaryLine T={T} label="Subtotal" value={fmt(subtotal)} />
              {discount > 0 && <SummaryLine T={T} label={`Promo ${settings?.promoCode}`} value={`-${fmt(discount)}`} />}
              <SummaryLine T={T} label={modality === 'pickup' ? 'Retiro' : 'Delivery'} value={zoneFee > 0 ? fmt(zoneFee) : fmt(0)} />
              <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: T.line }}>
                <span className="text-sm font-bold" style={{ color: T.cream }}>Total</span>
                <span className="text-xl font-bold" style={{ color: T.cream }}>{fmt(total)}</span>
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(217,45,32,0.12)', color: FV.red }}>{error}</div>}
            </>
          )}
        </div>
      </div>

      {/* bottom action */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]" style={{ backgroundColor: T.black }}>
        <div className="mx-auto max-w-xl space-y-2">
          {step === 2 && payment === 'YAPE_PLIN' && (
            <button
              onClick={submit}
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black disabled:opacity-60"
              style={isPEN ? { backgroundColor: FV.yape, color: '#fff' } : { backgroundColor: T.orange, color: T.black }}
            >
              {submitting ? 'ENVIANDO…' : `YA HICE EL PAGO · ENVIAR PEDIDO`}
            </button>
          )}
          {step < 2 && (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black disabled:opacity-50"
              style={{ backgroundColor: T.orange, color: T.black }}
            >
              <span>{step === 0 ? 'SIGUIENTE · ENTREGA' : 'SIGUIENTE · PAGO'}</span>
              <span>{fmt(Math.max(0, subtotal - discount) + zoneFee)}</span>
            </button>
          )}
          {step === 2 && payment === 'CASH' && (
            <button onClick={submit} disabled={submitting} className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm font-black disabled:opacity-60" style={{ backgroundColor: T.orange, color: T.black }}>
              <span>{submitting ? 'ENVIANDO…' : 'CONFIRMAR PEDIDO'}</span>
              <span>{fmt(total)}</span>
            </button>
          )}
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="w-full text-center text-xs font-bold" style={{ color: T.cream50 }}>
              ← Volver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ T, label, value, onChange, placeholder, textarea }: { T: ResolvedTheme; label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: T.cream50 }}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder}
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none placeholder:opacity-40" style={{ borderColor: T.line, backgroundColor: T.panel, color: T.cream }} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none placeholder:opacity-40" style={{ borderColor: T.line, backgroundColor: T.panel, color: T.cream }} />
      )}
    </label>
  );
}

function ModeBtn({ T, active, onClick, title, sub }: { T: ResolvedTheme; active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border px-4 py-3 text-left"
      style={{ borderColor: active ? T.orange : T.line, backgroundColor: active ? T.orange10 : T.panel }}
    >
      <div className="text-sm font-bold" style={{ color: active ? T.orange : T.cream }}>{title}</div>
      <div className="text-[11px]" style={{ color: T.cream50 }}>{sub}</div>
    </button>
  );
}

function SummaryLine({ T, label, value }: { T: ResolvedTheme; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: T.cream60 }}>{label}</span>
      <span style={{ color: T.cream }}>{value}</span>
    </div>
  );
}