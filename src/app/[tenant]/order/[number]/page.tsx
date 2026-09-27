import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/tenant/store'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'
import { waLink, buildWhatsAppMessage } from '@/lib/tenant/fukin-engine/whatsapp'
import { Order } from '@/lib/tenant/types'
import WaAutoSend from '@/components/tenant/wa-auto-send'
import PaymentClaimButton from '@/components/tenant/payment-claim-button'
import TransferenciaPayCard from '@/components/tenant/transferencia-pay-card'

export const dynamic = 'force-dynamic'

const STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Enviado por WhatsApp' },
  { key: 'RECEIVED', label: 'Pedido recibido' },
  { key: 'ACCEPTED', label: 'Aceptado' },
  { key: 'PREPARING', label: 'Preparando' },
  { key: 'READY', label: 'Listo' },
  { key: 'DISPATCHED', label: 'En camino' },
  { key: 'DELIVERED', label: 'Entregado' },
]

export default async function OrderPage({ params }: { params: { tenant: string; number: string } }) {
  const { tenant, number } = params
  const { getTenant } = await import('@/lib/tenant/registry')
  const cfg = await getTenant(tenant)
  if (!cfg) notFound()
  const order = await getOrder(tenant, number.toUpperCase())
  if (!order) notFound()

  const pending = order.status === 'PENDING_PAYMENT'
  const claimed = order.status === 'PAYMENT_CLAIMED' || order.paymentStatus === 'CLAIMED'
  const stepIdx = STEPS.findIndex((s) => s.key === order.status)
  const paid = order.paymentStatus === 'PAID' || order.paymentMethod === 'CASH' || order.status === 'PAYMENT_CLAIMED'

  const msg = waLink(buildWhatsAppMessage(order, cfg), cfg)

  return (
    <main className="px-4 pb-32 pt-6">
      <WaAutoSend orderNumber={order.number} waLink={msg} />
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="font-display text-3xl font-black text-fv-orange">{order.number}</div>
          <div className="mt-1 text-xs text-fv-cream/50">
            {new Date(order.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {order.scheduledFor && (
            <div className="mx-auto mt-2 inline-block rounded-full bg-fv-orange/15 px-3 py-1 text-[11px] font-black text-fv-orange">
              ENTREGA PROGRAMADA — {order.scheduledFor}
            </div>
          )}
        </div>

        {pending && (
          <div className="mt-6 rounded-2xl border border-fv-orange/40 bg-fv-orange/10 p-5">
            <div className="font-display text-base font-bold text-fv-cream">ÚLTIMO PASO — ENVÍA TU PEDIDO</div>
            <p className="mt-2 text-sm text-fv-cream/70">
              Toca el botón naranja: se abre WhatsApp con tu pedido completo ya escrito. Envíalo y la cocina lo ve al
              instante.
            </p>
            {order.paymentMethod === 'TRANSFERENCIA_QR' && (
              <div className="mt-4">
                <TransferenciaPayCard total={order.total} />
              </div>
            )}
          </div>
        )}

        {claimed && (
          <div className="mt-6 rounded-2xl border border-fv-green/40 bg-fv-green/10 p-5">
            <div className="font-display text-base font-bold text-fv-cream">PAGO EN REVISIÓN</div>
            <p className="mt-2 text-sm text-fv-cream/70">
              Nos llegó aviso de tu pago. Lo estamos verificando — te confirmamos en breve.
            </p>
          </div>
        )}

        <div className="mt-8">
          {STEPS.map((step, i) => {
            const done = i === 0 ? true : paid && i <= stepIdx
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${done ? 'border-fv-orange bg-fv-orange text-fv-black' : 'border-fv-line text-fv-cream/30'}`}>
                    {done ? '✓' : ''}
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-10 w-0.5 ${i < stepIdx && paid ? 'bg-fv-orange' : 'bg-fv-line'}`} />}
                </div>
                <div className={`pb-5 font-display text-sm font-bold ${done ? 'text-fv-cream' : 'text-fv-cream/30'}`}>{step.label}</div>
              </div>
              )
            })}
        </div>

        <div className="mt-2 rounded-2xl border border-fv-line bg-fv-panel p-4">
          {order.items.map((it, i) => (
            <div key={i} className="py-1">
              <div className="flex justify-between text-sm text-fv-cream">
                <span>{it.qty}x {it.name}</span>
                <span>{formatPEN(it.lineTotal)}</span>
              </div>
              {it.mods.length > 0 && <div className="text-[11px] text-fv-cream/50">{it.mods.join(', ')}</div>}
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-fv-line pt-2 text-sm text-fv-cream/60">
            <span>Delivery</span><span>{formatPEN(order.deliveryFee)}</span>
          </div>
          {order.promoCode && order.discount ? (
            <div className="mt-1 flex justify-between text-sm font-bold text-fv-green">
              <span>Promo {order.promoCode}</span><span>-{formatPEN(order.discount)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between font-display text-base font-bold text-fv-cream">
            <span>TOTAL</span><span>{formatPEN(order.total)}</span>
          </div>
          <div className="mt-2 text-xs text-fv-cream/40">
            {order.address.street} {order.address.apartment || ''}, {order.address.district}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <a
            href={msg}
            className={`block rounded-xl py-4 text-center font-display text-sm font-bold ${pending ? 'bg-fv-orange text-fv-black' : 'border border-fv-line bg-fv-panel text-fv-cream'}`}
          >
            {pending ? 'ENVIAR PEDIDO POR WHATSAPP →' : 'VER PEDIDO EN WHATSAPP'}
          </a>
          {pending && <PaymentClaimButton orderNumber={order.number} />}
        </div>

        <p className="mt-4 text-center text-[11px] text-fv-cream/40">
          powered by{' '}
          <a href="https://attendaapp.com/serve" target="_blank" rel="noopener noreferrer" className="underline">
            attendaapp.com/serve
          </a>
        </p>
      </div>
    </main>
  )
}

