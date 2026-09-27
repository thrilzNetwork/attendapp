'use client';

/* Attenda Serve — FV order receipt + tracker (/app/order/[number]).
   7-step machine (FV exact), auto-opens WhatsApp with the formatted order
   once, "Seguir pidiendo" keeps the loop going back to the menu. */

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { FV, formatPEN } from '@/lib/serve/fv-tokens';
import { SERVE_STATUSES } from '@/lib/serve/types';

type Order = {
  number: string; ts: number;
  items: { slug: string; name: string; qty: number; price: number }[];
  subtotal: number; zoneFee: number; discount: number; total: number;
  customer: { firstName: string; phone: string };
  address: { street: string; apartment?: string; reference?: string } | null;
  zoneId: string | null; notes?: string; scheduledFor?: string;
  payment: 'YAPE_PLIN' | 'CASH';
  paymentStatus: 'PENDING_PAYMENT' | 'CLAIMED' | 'PAID';
  status: string;
};

const STEP_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pago por confirmar',
  RECEIVED: 'Pedido recibido',
  ACCEPTED: 'Pedido aceptado',
  PREPARING: 'En cocina',
  READY: 'Listo',
  DISPATCHED: 'En camino',
  DELIVERED: 'Entregado',
};

export default function OrderPage() {
  const params = useParams<{ id: string; number: string }>();
  const { id, number } = params;
  const { data } = useTenant(id);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const waOpened = useRef(false);

  // poll the order every 8s (FV tracker behavior)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/serve/${id}/orders?number=${encodeURIComponent(number)}`, { cache: 'no-store' });
        if (!res.ok) {
          if (alive) setNotFound(true);
          return;
        }
        const body = await res.json();
        if (alive && body.ok && body.order) setOrder(body.order as Order);
      } catch {}
    };
    load();
    const iv = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [id, number]);

  // auto-open WhatsApp once, only when order exists
  useEffect(() => {
    if (!order || waOpened.current) return;
    waOpened.current = true;
    try {
      const raw = localStorage.getItem(`attd_serve_wa_${order.number}`);
      if (!raw) {
        localStorage.setItem(`attd_serve_wa_${order.number}`, '1');
        if (data?.tenant.phone) {
          const url = `https://wa.me/${data.tenant.phone}?text=${encodeURIComponent(waText(order, data.tenant.name))}`;
          window.open(url, '_blank');
        }
      }
    } catch {}
  }, [order, data]);

  if (notFound || (!order && data)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: FV.black, fontFamily: 'Fredoka, sans-serif' }}>
        <div className="text-sm" style={{ color: FV.cream60 }}>Pedido no encontrado.</div>
        <a href={`/serve/demo/${id}/app`} className="rounded-full px-6 py-3 text-sm font-black" style={{ backgroundColor: FV.orange, color: FV.black }}>VER EL MENÚ</a>
      </div>
    );
  }
  if (!order || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: FV.black }}>
        <div className="text-sm" style={{ color: FV.cream50 }}>Cargando pedido…</div>
      </div>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  const activeIdx = (SERVE_STATUSES as readonly string[]).indexOf(order.status);

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: FV.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={data.tenant.name} logo={data.tenant.logo} tagline={data.tenant.tagline} />
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-5">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: FV.cream50 }}>Pedido {order.number}</div>
          <h1 className="mt-1 text-3xl font-semibold" style={{ color: FV.cream }}>
            {cancelled ? 'Pedido cancelado' : order.payment === 'CASH' ? '¡Pedido confirmado!' : order.paymentStatus === 'PENDING_PAYMENT' ? '¡Pedido enviado!' : '¡Pago confirmado!'}
          </h1>
          <div className="mt-1 text-sm" style={{ color: FV.cream60 }}>
            {cancelled ? 'Si fue un error, escríbenos por WhatsApp.' : order.scheduledFor ? `Programado para las ${order.scheduledFor}` : 'Te avisamos por WhatsApp en cada paso.'}
          </div>
        </div>

        {!cancelled && (
          <div className="rounded-3xl border border-[#232323] bg-[#131313] p-4">
            {(SERVE_STATUSES as readonly string[]).map((s, i) => {
              const done = activeIdx >= 0 && i <= activeIdx;
              const isCurrent = i === activeIdx;
              return (
                <div key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black" style={{ backgroundColor: done ? FV.green : FV.panel, color: done ? FV.black : FV.cream50, border: `1px solid ${done ? FV.green : FV.line}` }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < (SERVE_STATUSES as readonly string[]).length - 1 && <div className="h-6 w-px" style={{ backgroundColor: done ? FV.green40 : FV.line }} />}
                  </div>
                  <div className="pb-2 text-sm" style={{ color: isCurrent ? FV.cream : FV.cream50, fontWeight: isCurrent ? 700 : 400 }}>
                    {STEP_LABELS[s]}
                    {isCurrent && s !== 'DELIVERED' && <span className="ml-2 text-xs" style={{ color: FV.orange }}>●</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-3xl border border-[#232323] bg-[#131313] p-4">
          {order.items.map((it) => (
            <div key={it.slug} className="flex items-center justify-between py-1.5 text-sm">
              <span style={{ color: FV.cream }}>{it.qty}× {it.name}</span>
              <span style={{ color: FV.cream60 }}>{formatPEN(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="mt-2 border-t border-[#232323] pt-2">
            <Row label="Subtotal" value={formatPEN(order.subtotal)} />
            {order.discount > 0 && <Row label="Descuento" value={`-${formatPEN(order.discount)}`} />}
            <Row label={order.zoneFee > 0 ? 'Delivery' : 'Retiro'} value={formatPEN(order.zoneFee)} />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: FV.cream }}>Total</span>
              <span className="text-lg font-bold" style={{ color: FV.cream }}>{formatPEN(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 space-y-1 border-t border-[#232323] pt-3 text-xs" style={{ color: FV.cream50 }}>
            <div>{order.customer.firstName} · {order.customer.phone}</div>
            {order.address?.street && <div>{order.address.street} {order.address.apartment || ''}{order.address.reference ? ` — ${order.address.reference}` : ''}</div>}
            {order.notes && <div>Notas: {order.notes}</div>}
            <div>Pago: {order.payment === 'CASH' ? 'Efectivo' : `Yape/Plin · ${order.paymentStatus === 'PENDING_PAYMENT' ? 'por confirmar' : order.paymentStatus === 'CLAIMED' ? 'yapeado, verificando' : 'confirmado'}`}</div>
          </div>
        </div>

        <a
          href={`/serve/demo/${id}/app`}
          className="flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black"
          style={{ backgroundColor: FV.orange, color: FV.black }}
        >
          SEGUIR PIDIENDO
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span style={{ color: FV.cream60 }}>{label}</span>
      <span style={{ color: FV.cream }}>{value}</span>
    </div>
  );
}

function waText(order: Order, tenantName: string): string {
  const lines: string[] = [];
  lines.push(`*NUEVO PEDIDO ${order.number}* — ${tenantName}`);
  for (const it of order.items) lines.push(`${it.qty}x ${it.name} — S/ ${(it.price * it.qty / 100).toFixed(2)}`);
  lines.push('');
  if (order.discount > 0) lines.push(`Descuento: -S/ ${(order.discount / 100).toFixed(2)}`);
  if (order.zoneFee > 0) lines.push(`Delivery: S/ ${(order.zoneFee / 100).toFixed(2)}`);
  lines.push(`*TOTAL: S/ ${(order.total / 100).toFixed(2)}*`);
  lines.push('');
  lines.push(`Cliente: ${order.customer.firstName} (${order.customer.phone})`);
  if (order.address?.street) lines.push(`Dirección: ${order.address.street}${order.address.apartment ? ' ' + order.address.apartment : ''}${order.address.reference ? ` — ${order.address.reference}` : ''}`);
  else lines.push('Modalidad: Retiro en tienda');
  if (order.scheduledFor) lines.push(`Entrega programada: ${order.scheduledFor}`);
  if (order.notes) lines.push(`Notas: ${order.notes}`);
  lines.push(`Pago: ${order.payment === 'CASH' ? 'Efectivo' : 'Yape/Plin'}`);
  return lines.join('\n');
}