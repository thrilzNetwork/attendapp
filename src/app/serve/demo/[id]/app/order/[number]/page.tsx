'use client';

/* Attenda Serve — order receipt + tracker (/app/order/[number], white-label).
   7-step machine (FV exact), auto-opens WhatsApp with the formatted order
   once, "Seguir pidiendo" keeps the loop going back to the menu.
   Colors + money from the tenant bundle. */

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTenant } from '@/components/serve/use-tenant';
import { ServeHeader } from '@/components/serve/fv-site-chrome';
import { FV } from '@/lib/serve/fv-tokens';
import { resolveTheme } from '@/lib/serve/theme';
import { CurrencyCode, formatMoney } from '@/lib/serve/types';
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

  const tenantTheme = data?.tenant.theme ?? null;
  const T = resolveTheme(tenantTheme);
  const currency = ((data?.tenant.currency || 'S/') as CurrencyCode);
  const fmt = (cents: number) => formatMoney(cents, currency);

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
          const url = `https://wa.me/${data.tenant.phone}?text=${encodeURIComponent(waText(order, data.tenant.name, currency))}`;
          window.open(url, '_blank');
        }
      }
    } catch {}
  }, [order, data, currency]);

  if (notFound || (!order && data)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
        <div className="text-sm" style={{ color: T.cream60 }}>Pedido no encontrado.</div>
        <a href={`/serve/demo/${id}/app`} className="rounded-full px-6 py-3 text-sm font-black" style={{ backgroundColor: T.orange, color: T.black }}>VER EL MENÚ</a>
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
  const payName = currency === 'S/' ? 'Yape/Plin' : 'QR/Transferencia';

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: T.black, fontFamily: 'Fredoka, sans-serif' }}>
      <ServeHeader tenantName={data.tenant.name} logo={data.tenant.logo} tagline={data.tenant.tagline} theme={tenantTheme} currency={currency} />
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-5">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: T.cream50 }}>Pedido {order.number}</div>
          <h1 className="mt-1 text-3xl font-semibold" style={{ color: T.cream }}>
            {cancelled ? 'Pedido cancelado' : order.payment === 'CASH' ? '¡Pedido confirmado!' : order.paymentStatus === 'PENDING_PAYMENT' ? '¡Pedido enviado!' : '¡Pago confirmado!'}
          </h1>
          <div className="mt-1 text-sm" style={{ color: T.cream60 }}>
            {cancelled ? 'Si fue un error, escríbenos por WhatsApp.' : order.scheduledFor ? `Programado para las ${order.scheduledFor}` : 'Te avisamos por WhatsApp en cada paso.'}
          </div>
        </div>

        {!cancelled && (
          <div className="rounded-3xl border p-4" style={{ borderColor: T.line, backgroundColor: T.panel }}>
            {(SERVE_STATUSES as readonly string[]).map((s, i) => {
              const done = activeIdx >= 0 && i <= activeIdx;
              const isCurrent = i === activeIdx;
              return (
                <div key={s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black" style={{ backgroundColor: done ? T.green : T.panel, color: done ? T.black : T.cream50, border: `1px solid ${done ? T.green : T.line}` }}>
                      {done ? '✓' : i + 1}
                    </div>
                    {i < (SERVE_STATUSES as readonly string[]).length - 1 && <div className="h-6 w-px" style={{ backgroundColor: done ? T.green40 : T.line }} />}
                  </div>
                  <div className="pb-2 text-sm" style={{ color: isCurrent ? T.cream : T.cream50, fontWeight: isCurrent ? 700 : 400 }}>
                    {STEP_LABELS[s]}
                    {isCurrent && s !== 'DELIVERED' && <span className="ml-2 text-xs" style={{ color: T.orange }}>●</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-3xl border p-4" style={{ borderColor: T.line, backgroundColor: T.panel }}>
          {order.items.map((it) => (
            <div key={it.slug} className="flex items-center justify-between py-1.5 text-sm">
              <span style={{ color: T.cream }}>{it.qty}× {it.name}</span>
              <span style={{ color: T.cream60 }}>{fmt(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="mt-2 border-t pt-2" style={{ borderColor: T.line }}>
            <Row T={T} label="Subtotal" value={fmt(order.subtotal)} />
            {order.discount > 0 && <Row T={T} label="Descuento" value={`-${fmt(order.discount)}`} />}
            <Row T={T} label={order.zoneFee > 0 ? 'Delivery' : 'Retiro'} value={fmt(order.zoneFee)} />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: T.cream }}>Total</span>
              <span className="text-lg font-bold" style={{ color: T.cream }}>{fmt(order.total)}</span>
            </div>
          </div>
          <div className="mt-3 space-y-1 border-t pt-3 text-xs" style={{ borderColor: T.line, color: T.cream50 }}>
            <div>{order.customer.firstName} · {order.customer.phone}</div>
            {order.address?.street && <div>{order.address.street} {order.address.apartment || ''}{order.address.reference ? ` — ${order.address.reference}` : ''}</div>}
            {order.notes && <div>Notas: {order.notes}</div>}
            <div>Pago: {order.payment === 'CASH' ? 'Efectivo' : `${payName} · ${order.paymentStatus === 'PENDING_PAYMENT' ? 'por confirmar' : order.paymentStatus === 'CLAIMED' ? 'realizado, verificando' : 'confirmado'}`}</div>
          </div>
        </div>

        <a
          href={`/serve/demo/${id}/app`}
          className="flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black"
          style={{ backgroundColor: T.orange, color: T.black }}
        >
          SEGUIR PIDIENDO
        </a>
      </div>
    </div>
  );
}

function Row({ T, label, value }: { T: ReturnType<typeof resolveTheme>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span style={{ color: T.cream60 }}>{label}</span>
      <span style={{ color: T.cream }}>{value}</span>
    </div>
  );
}

/* Client fallback text (server builds its own via lib/serve/orders). */
function waText(order: Order, tenantName: string, currency: CurrencyCode): string {
  const m = (cents: number) => formatMoney(cents, currency);
  const pay = currency === 'S/' ? 'Yape/Plin' : 'QR/Transferencia';
  const lines: string[] = [];
  lines.push(`*NUEVO PEDIDO ${order.number}* — ${tenantName}`);
  for (const it of order.items) lines.push(`${it.qty}x ${it.name} — ${m(it.price * it.qty)}`);
  lines.push('');
  if (order.discount > 0) lines.push(`Descuento: -${m(order.discount)}`);
  if (order.zoneFee > 0) lines.push(`Delivery: ${m(order.zoneFee)}`);
  lines.push(`*TOTAL: ${m(order.total)}*`);
  lines.push('');
  lines.push(`Cliente: ${order.customer.firstName} (${order.customer.phone})`);
  if (order.address?.street) lines.push(`Dirección: ${order.address.street}${order.address.apartment ? ' ' + order.address.apartment : ''}${order.address.reference ? ` — ${order.address.reference}` : ''}`);
  else lines.push('Modalidad: Retiro en tienda');
  if (order.scheduledFor) lines.push(`Entrega programada: ${order.scheduledFor}`);
  if (order.notes) lines.push(`Notas: ${order.notes}`);
  lines.push(`Pago: ${order.payment === 'CASH' ? 'Efectivo' : pay}`);
  return lines.join('\n');
}