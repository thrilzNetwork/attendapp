'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { tenantApi } from '@/lib/tenant/base-path'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/components/tenant/cart-context'
import { findProduct, formatPEN, selectedModifierInfo } from '@/lib/tenant/fukin-engine/pricing'
import { usePathname } from 'next/navigation'
import { SEED_ZONES } from '@/lib/tenant/fukin-engine/seed-menu'
import { UPSELLS } from '@/lib/tenant/fukin-engine/upsells'
import { ATTENDA_SERVE_URL } from '@/lib/tenant/fukin-engine/upsells'
import TransferenciaPayCard from '@/components/tenant/transferencia-pay-card'
import HoursClosedBanner, { HoursBadge } from '@/components/tenant/hours-banner'

type Step = 0 | 1 | 2
const STEPS: { title: string; short: string }[] = [
  { title: 'TU PEDIDO', short: 'Pedido' },
  { title: 'ENTREGA', short: 'Entrega' },
  { title: 'PAGO Y CONFIRMAR', short: 'Pago' },
]

const DRAFT_KEY = 't_checkout_draft'

export default function CheckoutPage() {
  const tenant = usePathname().split('/')[1]
  const cart = useCart()
  const menu = cart.menu
  const router = useRouter()
  const mainRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState<Step>(0)
  const [form, setForm] = useState({ firstName: '', phone: '', street: '', apartment: '', reference: '', notes: '' })
  // Delivery zone: null until the customer picks one in the address step —
  // no preterminado. Fee only counts once they've chosen.
  const [zoneId, setZoneId] = useState<string | null>(null)
  const [payment, setPayment] = useState<'TRANSFERENCIA_QR' | 'CASH'>('TRANSFERENCIA_QR')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [upsellQty, setUpsellQty] = useState<Record<string, number>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // scheduling: undefined = ASAP; 'HH:MM' = programado (validated against opening hours server-side)
  const [scheduleMode, setScheduleMode] = useState<'ASAP' | 'PROGRAMADO'>('ASAP')
  const [scheduleTime, setScheduleTime] = useState('20:30')

  // promo state
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoChecking, setPromoChecking] = useState(false)

  // restore draft (form + zone + payment) once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d.form) setForm((f) => ({ ...f, ...d.form }))
        if (d.zoneId && SEED_ZONES.some((z) => z.id === d.zoneId)) setZoneId(d.zoneId)
        if (d.payment === 'TRANSFERENCIA_QR' || d.payment === 'CASH') setPayment(d.payment)
      }
    } catch {}
  }, [])
  // persist draft
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, zoneId, payment }))
    } catch {}
  }, [form, zoneId, payment])

  const zone = (zoneId && SEED_ZONES.find((z) => z.id === zoneId)) || null
  const discount = promo?.discount || 0
  const upsellTotal = useMemo(
    () => Object.entries(upsellQty).reduce((a, [id, q]) => a + (UPSELLS.find((u) => u.id === id)?.price || 0) * q, 0),
    [upsellQty]
  )
  // Delivery fee only counts once the customer has picked a zone in the address step.
  const showFee = !!zone
  const total = Math.max(0, cart.subtotal + upsellTotal - discount) + (showFee ? zone.fee : 0)

  // per-step validity
  const nameOk = form.firstName.trim().length >= 2
  const phoneOk = /^\d{9,12}$/.test(form.phone.replace(/\s/g, ''))
  const streetOk = form.street.trim().length >= 5
  const stepValid: Record<Step, boolean> = {
    0: cart.lines.length > 0 && cart.subtotal >= 30,
    1: nameOk && phoneOk && streetOk && !!zone,
    2: true,
  }
  const allValid = stepValid[0] && stepValid[1]

  function goTo(s: Step) {
    setStep(s)
    setError('')
    requestAnimationFrame(() => mainRef.current?.scrollTo?.({ top: 0 }) ?? window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  async function applyPromo() {
    const code = promoInput.trim()
    if (!code) return
    setPromoChecking(true)
    setPromoMsg('')
    try {
      const res = await fetch(tenantApi(tenant, '/api/promos/validate'),  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: cart.subtotal }),
      })
      const data = await res.json()
      if (data.ok) {
        setPromo({ code: data.code, discount: data.discount })
        setPromoMsg(`Código ${data.code} aplicado — ahorras ${formatPEN(data.discount)}`)
      } else {
        setPromo(null)
        setPromoMsg(data.reason || 'Código no válido')
      }
    } catch {
      setPromoMsg('Error validando código')
    }
    setPromoChecking(false)
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(tenantApi(tenant, '/api/orders'),  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { firstName: form.firstName.trim(), phone: form.phone.trim() },
          address: { street: form.street.trim(), apartment: form.apartment.trim() || undefined, reference: form.reference.trim() || undefined },
          zoneId,
          paymentMethod: payment,
          notes: form.notes.trim() || undefined,
          items: cart.lines,
          promoCode: promo?.code,
          upsells: Object.entries(upsellQty).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })),
          scheduledFor: scheduleMode === 'PROGRAMADO' ? scheduleTime : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el pedido')
      cart.clear()
      try {
        localStorage.removeItem(DRAFT_KEY)
        sessionStorage.setItem('fv_wa_auto', data.number)
      } catch {}
      setConfirmed(true) // success overlay, then receipt
      setTimeout(() => router.push(`/app/order/${data.number}`), 900)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido')
      setSubmitting(false)
    }
  }

  const inputCls = (ok: boolean, touchedNow: boolean) =>
    `mt-2 w-full rounded-xl border bg-fv-panel p-3 text-sm text-fv-cream placeholder:text-fv-cream/30 focus:outline-none transition-colors ${
      touchedNow && !ok ? 'border-fv-orange' : 'border-fv-line focus:border-fv-orange'
    }`
  const labelCls = 'block font-display text-xs font-bold uppercase tracking-wider text-fv-cream/70'

  if (cart.lines.length === 0 && !confirmed) {
    return (
      <main className="px-4 pb-24 pt-10">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-2xl font-black text-fv-cream">NADA QUE PAGAR</h1>
          <Link href="/app/menu" className="mt-6 inline-block rounded-xl bg-fv-orange px-6 py-4 font-display text-sm font-bold text-fv-black">
            VER MENU
          </Link>
        </div>
      </main>
    )
  }

  const canAdvance = stepValid[step]

  return (
    <main ref={mainRef} className="px-4 pb-40 pt-4">
      <div className="mx-auto max-w-xl">
        {/* progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.short} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-fv-orange' : 'bg-fv-line'}`} />
              <div className={`mt-1.5 text-[10px] font-display font-bold uppercase tracking-wider ${i === step ? 'text-fv-orange' : i < step ? 'text-fv-cream/60' : 'text-fv-cream/30'}`}>
                {i < step ? '✓ ' : ''}{s.short}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-black text-fv-cream">{STEPS[step].title}</h1>
          <HoursBadge />
        </div>
        <HoursClosedBanner />

        {/* ============ STEP 0: TU PEDIDO ============ */}
        {step === 0 && (
          <section className="mt-4 motion-safe:animate-[fadeup_.25s_ease-out]">
            <div className="rounded-2xl border border-fv-line bg-fv-panel p-4">
              {cart.lines.map((line, i) => {
                const product = findProduct(line.slug, menu)
                if (!product) return null
                const info = selectedModifierInfo(product, line.mods)
                return (
                  <div key={i} className="flex justify-between py-1.5 text-sm text-fv-cream/70">
                    <span className="pr-3">{line.qty}x {product.name}{info.names.length > 0 && <span className="text-fv-cream/40"> · {info.names.join(', ')}</span>}</span>
                    <span className="shrink-0 tabular-nums">{formatPEN((product.price + info.extra) * line.qty)}</span>
                  </div>
                )
              })}
              {cart.subtotal < 30 && (
                <div className="mt-2 rounded-lg border border-fv-orange/30 px-3 py-2 text-[11px] text-fv-orange">
                  Mínimo de pedido: {formatPEN(30)} — te faltan {formatPEN(30 - cart.subtotal)}
                </div>
              )}
            </div>

            <div className="mt-4 font-display text-xs font-bold uppercase tracking-wider text-fv-orange">Suma algo mas? 👀</div>
            <div className="mt-2 space-y-2">
              {UPSELLS.filter((u) => u.active).map((u) => {
                const q = upsellQty[u.id] || 0
                return (
                  <div key={u.id} className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${q > 0 ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.image} alt={u.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-fv-cream">{u.name}</div>
                      <div className="text-xs text-fv-orange">{formatPEN(u.price)}</div>
                    </div>
                    {q > 0 ? (
                      <div className="flex items-center gap-1 rounded-lg border border-fv-orange">
                        <button onClick={() => setUpsellQty({ ...upsellQty, [u.id]: q - 1 })} className="px-2.5 py-1.5 font-display text-fv-cream active:scale-90 transition-transform">−</button>
                        <span className="min-w-5 text-center font-display text-sm font-bold text-fv-cream tabular-nums">{q}</span>
                        <button onClick={() => setUpsellQty({ ...upsellQty, [u.id]: Math.min(10, q + 1) })} className="px-2.5 py-1.5 font-display text-fv-cream active:scale-90 transition-transform">+</button>
                      </div>
                    ) : (
                      <button onClick={() => setUpsellQty({ ...upsellQty, [u.id]: 1 })} className="rounded-lg bg-fv-orange px-4 py-2 font-display text-xs font-bold text-fv-black active:scale-95 transition-transform">
                        AGREGAR
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ============ STEP 1: ENTREGA ============ */}
        {step === 1 && (
          <section className="mt-4 motion-safe:animate-[fadeup_.25s_ease-out]">
            <div className={labelCls}>Zona de delivery</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {SEED_ZONES.filter((z) => z.active).map((z) => (
                <button
                  key={z.id}
                  onClick={() => setZoneId(z.id)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors active:scale-[.99] ${zoneId === z.id ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}
                >
                  <div>
                    <div className="text-sm font-bold text-fv-cream">{z.name}</div>
                    <div className="text-[11px] text-fv-cream/50">{z.minMinutes}–{z.maxMinutes} min</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-fv-orange tabular-nums">{z.fee === 0 ? 'GRATIS' : formatPEN(z.fee)}</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${zoneId === z.id ? 'border-fv-orange bg-fv-orange text-fv-black' : 'border-fv-line text-transparent'}`}>✓</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className={labelCls}>Direccion</label>
              <input
                autoComplete="street-address"
                inputMode="text"
                placeholder="Av. / Calle / Jr. + numero"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, street: true }))}
                className={inputCls(streetOk, !!touched.street)}
              />
              {touched.street && !streetOk && <div className="mt-1 text-[11px] text-fv-orange">Escribe tu direccion completa</div>}
              {streetOk && <div className="mt-1 text-[11px] text-fv-green">✓ Direccion lista</div>}
              <input
                placeholder="Departamento / interior (opcional)"
                value={form.apartment}
                onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                className="mt-2 w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none"
              />
              <input
                placeholder="Referencia (opcional)"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="mt-2 w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className={labelCls}>Cuando lo entregamos</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setScheduleMode('ASAP')} className={`rounded-xl border px-4 py-3 text-left transition-colors active:scale-[.99] ${scheduleMode === 'ASAP' ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}>
                  <div className="text-sm font-bold text-fv-cream">Lo antes posible</div>
                  <div className="text-[11px] text-fv-cream/50">Entra a la cocina ya</div>
                </button>
                <button onClick={() => setScheduleMode('PROGRAMADO')} className={`rounded-xl border px-4 py-3 text-left transition-colors active:scale-[.99] ${scheduleMode === 'PROGRAMADO' ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}>
                  <div className="text-sm font-bold text-fv-cream">Programar</div>
                  <div className="text-[11px] text-fv-cream/50">Compra adelantada</div>
                </button>
              </div>
              {scheduleMode === 'PROGRAMADO' && (
                <div className="mt-2 rounded-xl border border-fv-line bg-fv-panel p-3">
                  <div className="text-[11px] text-fv-cream/50">Elige la hora de entrega (dentro de nuestro horario):</div>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-fv-line bg-fv-black px-3 py-2.5 text-sm text-fv-cream focus:border-fv-orange focus:outline-none"
                  />
                  <div className="mt-1.5 text-[10px] text-fv-cream/40">Pedimos dentro del horario de atencion — si ordenas de manana, te lo dejamos listo para la noche.</div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className={labelCls}>Tus datos</label>
              <input
                autoComplete="name"
                placeholder="Tu nombre"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                className={inputCls(nameOk, !!touched.firstName)}
              />
              <input
                autoComplete="tel"
                inputMode="numeric"
                maxLength={12}
                placeholder="Celular (9 digitos)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                className={inputCls(phoneOk, !!touched.phone)}
              />
              {touched.phone && !phoneOk && <div className="mt-1 text-[11px] text-fv-orange">Necesitamos 9 digitos para coordinar la entrega</div>}
              {phoneOk && <div className="mt-1 text-[11px] text-fv-green">✓ Celular listo</div>}
            </div>
          </section>
        )}

        {/* ============ STEP 2: PAGO + PROMO + NOTAS + RESUMEN ============ */}
        {step === 2 && (
          <section className="mt-4 motion-safe:animate-[fadeup_.25s_ease-out]">
            <div className={labelCls}>Metodo de pago</div>
            <div className="mt-2 space-y-2">
              <button onClick={() => setPayment('TRANSFERENCIA_QR')} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors active:scale-[.99] ${payment === 'TRANSFERENCIA_QR' ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}>
                <div>
                  <div className="text-sm font-bold text-fv-cream">Transferencia / Plin</div>
                  <div className="text-[11px] text-fv-cream/50">Paga al QR y confirma. Aceptamos al ver tu pago.</div>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${payment === 'TRANSFERENCIA_QR' ? 'border-fv-orange bg-fv-orange text-fv-black' : 'border-fv-line text-transparent'}`}>✓</span>
              </button>
              {payment === 'TRANSFERENCIA_QR' && (
                <div className="pt-1">
                  <TransferenciaPayCard total={total} compact />
                  <p className="mt-1.5 px-1 text-[11px] text-fv-cream/40">También aparece en la página de tu pedido después de confirmar.</p>
                </div>
              )}
              <button onClick={() => setPayment('CASH')} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors active:scale-[.99] ${payment === 'CASH' ? 'border-fv-orange bg-fv-orange/10' : 'border-fv-line bg-fv-panel'}`}>
                <div>
                  <div className="text-sm font-bold text-fv-cream">Efectivo</div>
                  <div className="text-[11px] text-fv-cream/50">Paga al recibir. Ten el monto listo.</div>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${payment === 'CASH' ? 'border-fv-orange bg-fv-orange text-fv-black' : 'border-fv-line text-transparent'}`}>✓</span>
              </button>
            </div>

            {/* promo */}
            <div className="mt-4">
              <div className={labelCls}>Codigo de promocion</div>
              {promo ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-fv-green/40 bg-fv-green/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-fv-green">{promo.code} aplicado</div>
                    <div className="text-[11px] text-fv-cream/50">Ahorras {formatPEN(promo.discount)}</div>
                  </div>
                  <button onClick={() => { setPromo(null); setPromoInput(''); setPromoMsg('') }} className="text-xs font-bold text-fv-cream/50">QUITAR</button>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                    placeholder="CO-PRIMERO"
                    autoCapitalize="characters"
                    className="w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm uppercase text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none"
                  />
                  <button onClick={applyPromo} disabled={promoChecking || !promoInput.trim()} className="shrink-0 rounded-xl border border-fv-orange px-5 font-display text-xs font-bold text-fv-orange disabled:opacity-40">
                    {promoChecking ? '...' : 'APLICAR'}
                  </button>
                </div>
              )}
              {promoMsg && !promo && <div className="mt-1.5 text-[11px] text-fv-orange">{promoMsg}</div>}
            </div>

            {/* notes */}
            <div className="mt-4">
              <div className={labelCls}>Notas</div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Cualquier detalle del pedido (opcional)" className="mt-2 w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none" />
            </div>

            {/* review — delivery fee appears only after address (step 1+); items not repeated */}
            <div className="mt-4 rounded-2xl border border-fv-line bg-fv-panel p-4">
              <div className="font-display text-xs font-bold uppercase tracking-wider text-fv-cream/50">Resumen</div>
              <div className="flex justify-between py-1 text-sm text-fv-cream/70"><span>Subtotal pedido ({cart.count} item{cart.count === 1 ? '' : 's'})</span><span className="tabular-nums">{formatPEN(Math.max(0, cart.subtotal + upsellTotal - discount))}</span></div>
              {zone ? (
                <div className="flex justify-between py-1 text-sm text-fv-cream/70"><span>Delivery · {zone.name}</span><span className="tabular-nums">{formatPEN(zone.fee)}</span></div>
              ) : (
                <div className="flex justify-between py-1 text-sm text-fv-cream/40"><span>Delivery</span><span className="tabular-nums">—</span></div>
              )}
              {discount > 0 && (
                <div className="flex justify-between py-1 text-sm font-bold text-fv-green">
                  <span>Descuento ({promo?.code})</span>
                  <span className="tabular-nums">-{formatPEN(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-fv-line pt-2 font-display text-base font-bold text-fv-cream">
                <span>TOTAL</span><span className="tabular-nums">{formatPEN(total)}</span>
              </div>
            </div>
          </section>
        )}

        {error && <div className="mt-4 rounded-xl border border-fv-orange/40 bg-fv-orange/10 p-3 text-sm text-fv-orange">{error}</div>}
      </div>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-fv-line bg-fv-black/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 0 && (
            <button onClick={() => goTo((step - 1) as Step)} className="rounded-xl border border-fv-line px-5 py-3.5 font-display text-sm font-bold text-fv-cream active:scale-95 transition-transform">
              ←
            </button>
          )}
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-fv-cream/50">
              <span>{cart.count} item{cart.count === 1 ? '' : 's'}</span>
              <span className="font-display font-bold text-fv-cream tabular-nums">{formatPEN(total)}</span>
            </div>
            <button
              disabled={!stepValid[step] || submitting}
              onClick={() => (step < 2 ? goTo((step + 1) as Step) : submit())}
              className={`mt-1 w-full rounded-xl py-3 font-display text-sm font-bold transition-all active:scale-[.98] ${stepValid[step] && !submitting ? 'bg-fv-orange text-fv-black' : 'bg-fv-panel text-fv-cream/30'}`}
            >
              {submitting ? 'ENVIANDO...' : step === 0 ? 'SIGUIENTE · ENTREGA' : step === 1 ? 'SIGUIENTE · PAGO' : 'CONFIRMAR Y ENVIAR POR WHATSAPP'}
            </button>
          </div>
        </div>
      </div>

      {/* success overlay */}
      {confirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fv-black/90">
          <div className="text-center motion-safe:animate-[pop_.3s_ease-out]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fv-green/15 text-3xl text-fv-green">✓</div>
            <div className="mt-3 font-display text-xl font-black text-fv-cream">PEDIDO CONFIRMADO</div>
            <div className="mt-1 text-xs text-fv-cream/50">Abriendo WhatsApp...</div>
          </div>
        </div>
      )}

      <a href={ATTENDA_SERVE_URL} target="_blank" rel="noopener noreferrer" className="mt-6 block text-center text-[11px] text-fv-cream/30">
        attendaapp.com/serve
      </a>
    </main>
  )
}