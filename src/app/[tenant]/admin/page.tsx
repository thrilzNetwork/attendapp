'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Order, Promo } from '@/lib/tenant/types'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'

/* ============================== shared ============================== */

type Tab = 'pos' | 'kitchen' | 'orders' | 'menu' | 'inventory' | 'promos' | 'reports' | 'settings'

// module-scope: set by AdminPage on mount, read by api() + login helpers
let __tenant = ''
const T = (path: string): string => `/api/tenant/${__tenant}/${path.replace(/^\/api\//, '')}`

const TABS: { id: Tab; label: string }[] = [
  { id: 'pos', label: 'NUEVO PEDIDO' },
  { id: 'kitchen', label: 'COCINA' },
  { id: 'orders', label: 'PEDIDOS' },
  { id: 'menu', label: 'MENU' },
  { id: 'inventory', label: 'INVENTARIO' },
  { id: 'promos', label: 'PROMOS' },
  { id: 'reports', label: 'REPORTES' },
  { id: 'settings', label: 'AJUSTES' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'PAGO PENDIENTE',
  PAYMENT_CLAIMED: 'PAGO EN REVISION',
  RECEIVED: 'NUEVO',
  ACCEPTED: 'ACEPTADO',
  PREPARING: 'PREPARANDO',
  READY: 'LISTO',
  DISPATCHED: 'EN CAMINO',
  DELIVERED: 'ENTREGADO',
  CANCELLED: 'CANCELADO',
}

const PAY_LABEL: Record<string, string> = { PENDING: 'PAGO PENDIENTE', CLAIMED: 'COMPROBANTE ENVIADO', PAID: 'PAGADO', UNPAID: 'EFECTIVO' }

type ApiResult = { ok: boolean; status: number; data: unknown }

async function api(path: string, init?: RequestInit): Promise<ApiResult> {
  const token = sessionStorage.getItem('fv_admin_token') || ''
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token, ...(init?.headers || {}) },
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {}
  return { ok: res.ok, status: res.status, data }
}

/* ============================== login ============================== */

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function login() {
    const res = await fetch(T('/api/admin/login'),  {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      const data = await res.json()
      sessionStorage.setItem('fv_admin', 'ok')
      sessionStorage.setItem('fv_admin_token', data.token)
      onOk()
    } else {
      setError('Contrasena incorrecta')
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <h1 className="font-display text-2xl font-black text-fv-cream">FV ADMIN</h1>
        <p className="mt-1 text-xs text-fv-cream/50">Solo personal. David, esta bien.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          placeholder="Contrasena"
          className="mt-4 w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm text-fv-cream focus:border-fv-orange focus:outline-none"
        />
        {error && <div className="mt-2 text-xs text-fv-orange">{error}</div>}
        <button onClick={login} className="mt-3 w-full rounded-xl bg-fv-orange py-3 font-display text-sm font-bold text-fv-black">
          ENTRAR
        </button>
      </div>
    </main>
  )
}

/* ============================== kitchen board ============================== */

const COLUMNS = [
  { key: 'RECEIVED', label: 'NUEVO' },
  { key: 'ACCEPTED', label: 'ACEPTADO' },
  { key: 'PREPARING', label: 'PREPARANDO' },
  { key: 'READY', label: 'LISTO' },
  { key: 'DISPATCHED', label: 'EN CAMINO' },
  { key: 'DELIVERED', label: 'ENTREGADO' },
]

function OrderCard({ o, onPatch, onDelete, compact }: { o: Order; onPatch: (n: string, patch: Record<string, string>) => void; onDelete?: (n: string) => void; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-fv-line bg-fv-panel p-3">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm font-black text-fv-cream">{o.number}</span>
        <span className="text-[10px] text-fv-cream/40">{new Date(o.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-fv-green">{PAY_LABEL[o.paymentStatus] || o.paymentStatus}</span>
        {o.scheduledFor && (
          <span className="rounded bg-fv-orange/15 px-1.5 py-0.5 text-[9px] font-black text-fv-orange">PROGRAMADO {o.scheduledFor}</span>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {o.items.map((it, i) => (
          <div key={i} className="text-xs text-fv-cream/80">
            <span className="font-bold">{it.qty}x</span> {it.name}
            {it.mods.length > 0 && <div className="pl-4 text-[10px] text-fv-cream/50">{it.mods.join(', ')}</div>}
            {it.notes && <div className="pl-4 text-[10px] italic text-fv-cream/50">&quot;{it.notes}&quot;</div>}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="mt-2 border-t border-fv-line pt-2 text-[10px] text-fv-cream/60">
          {o.customer.firstName} · {o.customer.phone}
          <br />
          {o.address.district} — {o.address.street} {o.address.apartment || ''}
          {o.address.reference && <><br />Ref: {o.address.reference}</>}
        </div>
      )}
      {o.promoCode && o.discount ? (
        <div className="mt-1 text-[10px] font-bold text-fv-green">
          PROMO {o.promoCode} — -{formatPEN(o.discount)}
        </div>
      ) : null}
      <div className="mt-2 font-display text-sm font-bold text-fv-orange">Bs {(o.total / 100).toFixed(2)}</div>
      {o.notes && <div className="mt-1 text-[10px] italic text-fv-cream/50">Nota: {o.notes}</div>}

      {o.paymentMethod === 'CASH' && o.paymentStatus === 'UNPAID' && ['READY', 'DISPATCHED'].includes(o.status) && (
        <button
          onClick={() => onPatch(o.number, { paymentStatus: 'PAID' })}
          className="mt-2 w-full rounded-lg bg-fv-green py-2 text-[11px] font-bold text-fv-black"
        >
          COBRAR EFECTIVO
        </button>
      )}
      {o.paymentMethod === 'TRANSFERENCIA_QR' && o.paymentStatus !== 'PAID' && o.paymentStatus !== 'UNPAID' && (
        <button
          onClick={() =>
            onPatch(o.number, {
              paymentStatus: 'PAID',
              ...(o.status === 'PENDING_PAYMENT' ? { status: 'RECEIVED' } : {}),
            })
          }
          className="mt-2 w-full rounded-lg bg-fv-green py-2 text-[11px] font-bold text-fv-black"
        >
          {o.paymentStatus === 'CLAIMED' || o.status === 'PAYMENT_CLAIMED' ? 'CONFIRMAR PAGO' : 'YO CONFIRMÉ EL PAGO'}
        </button>
      )}
      {o.paymentMethod === 'TRANSFERENCIA_QR' && o.status === 'PENDING_PAYMENT' && o.paymentStatus === 'PENDING' && (
        <div className="mt-2 rounded-lg border border-fv-orange/30 px-2 py-1.5 text-center text-[10px] text-fv-cream/60">
          ¿Ya llegó el Transferencia? Toca YO CONFIRMÉ EL PAGO arriba — o espera la captura del cliente.
        </div>
      )}

      <div className="mt-2 flex gap-2">
        {o.status === 'PENDING_PAYMENT' && (
          <button onClick={() => onPatch(o.number, { status: 'RECEIVED' })} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black">RECIBIDO</button>
        )}
        {o.status === 'RECEIVED' && (
          <button onClick={() => onPatch(o.number, { status: 'ACCEPTED' })} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black">ACEPTAR</button>
        )}
        {o.status === 'ACCEPTED' && (
          <button onClick={() => onPatch(o.number, { status: 'PREPARING' })} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black">PREPARAR</button>
        )}
        {o.status === 'PREPARING' && (
          <button onClick={() => onPatch(o.number, { status: 'READY' })} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black">LISTO</button>
        )}
        {o.status === 'READY' && (
          <button onClick={() => onPatch(o.number, { status: 'DISPATCHED' })} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black">DESPACHAR</button>
        )}
        {o.status === 'DISPATCHED' && (
          <button onClick={() => onPatch(o.number, { status: 'DELIVERED' })} className="flex-1 rounded-lg bg-fv-green py-2 text-[11px] font-bold text-fv-black">ENTREGADO</button>
        )}
        {['PENDING_PAYMENT', 'PAYMENT_CLAIMED', 'CANCELLED', 'DELIVERED'].includes(o.status) && (
          <span className="flex-1 text-center text-[10px] text-fv-cream/30">{STATUS_LABEL[o.status]}</span>
        )}
        {!['PENDING_PAYMENT', 'PAYMENT_CLAIMED', 'DELIVERED', 'CANCELLED'].includes(o.status) && (
          <button onClick={() => onPatch(o.number, { status: 'CANCELLED' })} className="rounded-lg border border-fv-orange/40 px-2 py-2 text-[10px] font-bold text-fv-orange">
            CANCELAR
          </button>
        )}
      </div>
      {onDelete && (
        <DeleteOrderControl number={o.number} onDelete={onDelete} />
      )}
    </div>
  )
}

/* Two-step delete: red ELIMINAR -> typing the order number arms CONFIRMAR DEFINITIVO. */
function DeleteOrderControl({ number, onDelete }: { number: string; onDelete: (n: string) => void }) {
  const [arming, setArming] = useState(false)
  const [typed, setTyped] = useState('')
  if (!arming) {
    return (
      <button onClick={() => setArming(true)} className="mt-2 w-full rounded-lg border border-fv-red/30 py-1.5 text-[10px] font-bold text-fv-red/70">
        ELIMINAR
      </button>
    )
  }
  return (
    <div className="mt-2 rounded-lg border border-fv-red/40 p-2">
      <div className="text-[10px] font-bold text-fv-red">¿Eliminar {number}?</div>
      <div className="mt-1 text-[9px] text-fv-cream/50">Borra el pedido y todo su historial. Escribe {number} para confirmar.</div>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value.toUpperCase())}
        placeholder={number}
        className="mt-1.5 w-full rounded border border-fv-line bg-fv-black px-2 py-1.5 text-[11px] text-fv-cream outline-none focus:border-fv-red"
      />
      <div className="mt-1.5 flex gap-2">
        <button onClick={() => { setArming(false); setTyped('') }} className="flex-1 rounded border border-fv-line py-1.5 text-[10px] text-fv-cream/60">
          VOLVER
        </button>
        <button
          disabled={typed !== number}
          onClick={() => onDelete(number)}
          className="flex-1 rounded bg-fv-red py-1.5 text-[10px] font-bold text-white disabled:opacity-30"
        >
          CONFIRMAR DEFINITIVO
        </button>
      </div>
    </div>
  )
}

function KitchenBoard({ orders, onPatch }: { orders: Order[]; onPatch: (n: string, patch: Record<string, string>) => void }) {
  const boardOrders = orders.filter((o) => o.status !== 'CANCELLED')
  return (
    <div className="mt-4 overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
        {COLUMNS.map((col) => {
          const colOrders = boardOrders.filter((o) => o.status === col.key)
          return (
            <div key={col.key} className="w-64 shrink-0">
              <div className="flex items-center justify-between border-b border-fv-line pb-2">
                <span className="font-display text-xs font-bold tracking-wider text-fv-orange">{col.label}</span>
                <span className="text-xs text-fv-cream/40">{colOrders.length}</span>
              </div>
              <div className="mt-3 space-y-3">
                {colOrders.map((o) => (
                  <OrderCard key={o.number} o={o} onPatch={onPatch} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================== orders list ============================== */

function OrdersList({ orders, onPatch, onDelete }: { orders: Order[]; onPatch: (n: string, patch: Record<string, string>) => void; onDelete: (n: string) => void }) {
  const [filter, setFilter] = useState('ALL')
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (filter !== 'ALL' && o.status !== filter) return false
        if (!q.trim()) return true
        const s = q.toLowerCase()
        return (
          o.number.toLowerCase().includes(s) ||
          o.customer.firstName.toLowerCase().includes(s) ||
          o.customer.phone.includes(s) ||
          o.address.street.toLowerCase().includes(s)
        )
      }),
    [orders, filter, q],
  )
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar #, nombre, celular, calle..."
          className="w-full rounded-xl border border-fv-line bg-fv-panel px-3 py-2 text-xs text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none sm:w-72"
        />
        <div className="flex flex-wrap gap-1">
          {['ALL', 'PENDING_PAYMENT', 'RECEIVED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${filter === f ? 'bg-fv-orange text-fv-black' : 'border border-fv-line bg-fv-panel text-fv-cream/60'}`}
            >
              {f === 'ALL' ? 'TODOS' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((o) => (
          <OrderCard key={o.number} o={o} onPatch={onPatch} onDelete={onDelete} />
        ))}
      </div>
      {filtered.length === 0 && <div className="py-10 text-center text-xs text-fv-cream/30">Sin pedidos que coincidan.</div>}
    </div>
  )
}

/* ============================== menu manager ============================== */

type ModGroup = { id: string; name: string; type: 'single' | 'multi'; required: boolean; modifiers: { id: string; name: string; price: number }[] }

type AdminProduct = {
  slug: string
  name: string
  short: string
  long: string
  category: string
  price: number
  image: string
  active: boolean
  soldOut: boolean
  proteinBadge?: string
  groups?: ModGroup[]
  stock?: { dailyCount: number; countDate: string; auto86Threshold: number } | null
}

/* ============================== POS terminal ============================== */

type PosCartLine = { slug: string; name: string; qty: number; unit: number; mods: Record<string, string[]>; modTotal: number; notes: string }

function PosTerminal({ products, onCreated }: { products: AdminProduct[]; onCreated: () => void }) {
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [cat, setCat] = useState<string>('ALL')
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [mods, setMods] = useState<Record<string, string[]>>({})
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [payment, setPayment] = useState<'CASH' | 'TRANSFERENCIA_QR'>('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [pickup, setPickup] = useState(true)
  const [done, setDone] = useState<{ number: string } | null>(null)
  const [error, setError] = useState('')

  const categories = useMemo(() => Array.from(new Set(products.filter((x) => x.active && !x.soldOut).map((x) => x.category))), [products])
  const visible = useMemo(() => products.filter((x) => x.active && !x.soldOut && (cat === 'ALL' || x.category === cat)), [products, cat])
  const subtotal = cart.reduce((s, l) => s + (l.unit + l.modTotal) * l.qty, 0)

  function selProduct(p: AdminProduct) {
    const hasReq = (p.groups || []).some((g: { required?: boolean }) => g.required)
    if (!hasReq) { addLine(p, {}); return }
    setOpenItem(p.slug)
    setMods({})
  }
  function addLine(p: AdminProduct, chosen: Record<string, string[]>) {
    const modTotal = (p.groups || []).reduce((s, g) => s + (chosen[g.id] || []).reduce((x, id) => x + (g.modifiers.find((m) => m.id === id)?.price || 0), 0), 0)
    setCart((c) => [...c, { slug: p.slug, name: p.name, qty: 1, unit: p.price, mods: chosen, modTotal, notes: '' }])
    setOpenItem(null); setMods({})
  }
  function qty(i: number, d: number) {
    setCart((c) => c.map((l, j) => (j === i ? { ...l, qty: Math.max(1, l.qty + d) } : l)))
  }
  function drop(i: number) { setCart((c) => c.filter((_, j) => j !== i)) }

  async function submit() {
    if (!custName.trim() || !custPhone.trim() || !cart.length || submitting) return
    setSubmitting(true); setError('')
    const res = await api(T('/api/admin/orders'), {
      method: 'POST',
      body: JSON.stringify({
        customer: { firstName: custName.trim(), phone: custPhone.trim() },
        address: { street: pickup ? 'MOSTRADOR' : 'DELIVERY MANUAL' },
        zoneId: pickup ? 'mostrador' : 'equipetrol',
        paymentMethod: payment,
        notes: orderNotes.trim() || undefined,
        items: cart.map((l) => ({ slug: l.slug, qty: l.qty, mods: l.mods, notes: l.notes || undefined })),
      }),
    })
    setSubmitting(false)
    if (res.ok && (res.data as { number?: string })?.number) {
      setDone({ number: (res.data as { number: string }).number })
      setCart([]); setCustName(''); setCustPhone(''); setOrderNotes('')
      onCreated()
    } else {
      setError(((res.data as { error?: string })?.error) || `Error ${res.status}`)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-fv-line bg-fv-panel p-8 text-center">
        <div className="text-3xl font-display font-black text-fv-orange">PEDIDO {done.number}</div>
        <div className="text-sm text-fv-cream/70">Enviado a cocina. Cóbrale en mostrador si es EFECTIVO.</div>
        <button onClick={() => setDone(null)} className="rounded-lg bg-fv-orange px-6 py-3 font-display font-bold text-fv-black">NUEVO PEDIDO</button>
      </div>
    )
  }

  const open = openItem ? products.find((x) => x.slug === openItem) : null

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px]">
      {/* left: catalog */}
      <div className="rounded-xl border border-fv-line bg-fv-panel p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          <button onClick={() => setCat('ALL')} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${cat === 'ALL' ? 'bg-fv-orange text-fv-black' : 'border border-fv-line text-fv-cream/60'}`}>TODOS</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase ${cat === c ? 'bg-fv-orange text-fv-black' : 'border border-fv-line text-fv-cream/60'}`}>{c}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visible.map((p) => (
            <button key={p.slug} onClick={() => selProduct(p)} className="rounded-lg border border-fv-line bg-fv-black p-2 text-left hover:border-fv-orange">
              <div className="text-[12px] font-bold leading-tight text-fv-cream">{p.name}</div>
              <div className="mt-1 text-[11px] text-fv-orange">{formatPEN(p.price)}</div>
            </button>
          ))}
        </div>
        {!visible.length && <div className="py-6 text-center text-xs text-fv-cream/50">Sin productos en esta categoría.</div>}
      </div>

      {/* right: ticket */}
      <div className="flex flex-col gap-2 rounded-xl border border-fv-line bg-fv-panel p-3">
        <div className="font-display text-xs font-bold tracking-wide text-fv-cream/70">TICKET</div>
        {!cart.length && <div className="py-4 text-center text-xs text-fv-cream/50">Toca un producto para agregarlo.</div>}
        {cart.map((l, i) => (
          <div key={i} className="rounded-lg border border-fv-line bg-fv-black p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-bold text-fv-cream">{l.name}</div>
              <div className="text-[12px] font-bold text-fv-orange">{formatPEN((l.unit + l.modTotal) * l.qty)}</div>
            </div>
            {!!Object.values(l.mods).flat().length && <div className="mt-0.5 text-[10px] text-fv-cream/50">{Object.values(l.mods).flat().join(', ')}</div>}
            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => qty(i, -1)} className="h-6 w-6 rounded border border-fv-line text-xs text-fv-cream">−</button>
              <span className="text-xs font-bold">{l.qty}</span>
              <button onClick={() => qty(i, 1)} className="h-6 w-6 rounded border border-fv-line text-xs text-fv-cream">+</button>
              <button onClick={() => drop(i)} className="ml-auto text-[10px] text-red-400">QUITAR</button>
            </div>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-fv-line pt-2 text-sm font-bold">
          <span>TOTAL</span><span className="text-fv-orange">{formatPEN(subtotal)}</span>
        </div>
        <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Nombre" className="rounded-lg border border-fv-line bg-fv-black px-2.5 py-2 text-xs text-fv-cream outline-none focus:border-fv-orange" />
        <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="Teléfono" inputMode="tel" className="rounded-lg border border-fv-line bg-fv-black px-2.5 py-2 text-xs text-fv-cream outline-none focus:border-fv-orange" />
        <input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Notas (opcional)" className="rounded-lg border border-fv-line bg-fv-black px-2.5 py-2 text-xs text-fv-cream outline-none focus:border-fv-orange" />
        <label className="flex items-center gap-2 text-[11px] text-fv-cream/70">
          <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} className="accent-[color:var(--acc)]" />
          Mostrador (sin delivery)
        </label>
        <div className="flex gap-2">
          {(['CASH', 'TRANSFERENCIA_QR'] as const).map((m) => (
            <button key={m} onClick={() => setPayment(m)} className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold ${payment === m ? 'bg-fv-orange text-fv-black' : 'border border-fv-line text-fv-cream/60'}`}>
              {m === 'CASH' ? 'EFECTIVO' : 'QR / TRANSFERENCIA'}
            </button>
          ))}
        </div>
        <button onClick={submit} disabled={!cart.length || !custName.trim() || !custPhone.trim() || submitting} className="rounded-lg bg-fv-orange px-4 py-3 font-display text-sm font-black text-fv-black disabled:opacity-40">
          {submitting ? 'ENVIANDO…' : 'CREAR PEDIDO'}
        </button>
        {error && <div className="text-[11px] text-red-400">{error}</div>}
      </div>

      {/* modifier modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => { setOpenItem(null) }}>
          <div className="w-full max-w-sm rounded-xl border border-fv-line bg-fv-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 font-display text-sm font-black text-fv-cream">{open.name}</div>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {(open.groups || []).map((g) => (
                <div key={g.id}>
                  <div className="mb-1 text-[11px] font-bold text-fv-cream/70">{g.name}{g.required ? ' *' : ''}</div>
                  <div className="space-y-1">
                    {g.modifiers.map((m) => {
                      const on = (mods[g.id] || []).includes(m.id)
                      return (
                        <button key={m.id}
                          onClick={() => setMods((cur) => {
                            const curList = cur[g.id] || []
                            const nextList = g.type === 'single' ? [m.id] : on ? curList.filter((x) => x !== m.id) : [...curList, m.id]
                            return { ...cur, [g.id]: nextList }
                          })}
                          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] ${on ? 'border-fv-orange text-fv-orange' : 'border-fv-line text-fv-cream/70'}`}>
                          <span>{m.name}</span>
                          {!!m.price && <span>+{formatPEN(m.price)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setOpenItem(null)} className="flex-1 rounded-lg border border-fv-line px-3 py-2.5 text-xs font-bold text-fv-cream/70">CANCELAR</button>
              <button
                onClick={() => addLine(open, mods)}
                disabled={(open.groups || []).some((g) => g.required && !(mods[g.id] || []).length)}
                className="flex-1 rounded-lg bg-fv-orange px-3 py-2.5 text-xs font-black text-fv-black disabled:opacity-40">AGREGAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================== end POS ============================== */

function MenuManager({ products, onChanged }: { products: AdminProduct[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; price: string; short: string; long: string; image: string }>({ name: '', price: '', short: '', long: '', image: '' })
  const [saving, setSaving] = useState(false)

  function startEdit(p: AdminProduct) {
    setEditing(p.slug)
    setDraft({ name: p.name, price: (p.price / 100).toFixed(2), short: p.short, long: p.long, image: p.image })
  }

  async function save(slug: string) {
    setSaving(true)
    const priceCents = Math.round(parseFloat(draft.price.replace(',', '.')) * 100)
    const patch: Record<string, unknown> = {}
    if (draft.name.trim()) patch.name = draft.name.trim()
    if (Number.isFinite(priceCents) && priceCents > 0) patch.price = priceCents
    if (draft.short.trim()) patch.short = draft.short.trim()
    if (draft.long.trim()) patch.long = draft.long.trim()
    if (draft.image.trim()) patch.image = draft.image.trim()
    await api(T(`/api/admin/menu/${slug}`),  { method: 'PATCH', body: JSON.stringify(patch) })
    setEditing(null)
    setSaving(false)
    onChanged()
  }

  async function toggleActive(p: AdminProduct) {
    await api(T(`/api/admin/menu/${p.slug}`),  { method: 'PATCH', body: JSON.stringify({ active: !p.active }) })
    onChanged()
  }

  async function toggleSoldOut(p: AdminProduct) {
    await api(T(`/api/admin/menu/${p.slug}`),  { method: 'PATCH', body: JSON.stringify({ soldOut: !p.soldOut }) })
    onChanged()
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-fv-line bg-fv-black p-2 text-xs text-fv-cream focus:border-fv-orange focus:outline-none'

  return (
    <div className="mt-4 space-y-3">
      {products.map((p) => (
        <div key={p.slug} className="rounded-xl border border-fv-line bg-fv-panel p-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-bold text-fv-cream">{p.name}</div>
              <div className="text-xs text-fv-orange">{formatPEN(p.price)} · {p.category}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button onClick={() => toggleActive(p)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${p.active ? 'bg-fv-green text-fv-black' : 'bg-fv-panel text-fv-cream/40 border border-fv-line'}`}>
                {p.active ? 'ACTIVO' : 'OCULTO'}
              </button>
              <button onClick={() => toggleSoldOut(p)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${p.soldOut ? 'bg-fv-orange text-fv-black' : 'border border-fv-line bg-fv-panel text-fv-cream/40'}`}>
                {p.soldOut ? 'AGOTADO' : 'STOCK OK'}
              </button>
              <button onClick={() => startEdit(p)} className="rounded-lg border border-fv-line px-2.5 py-1 text-[10px] font-bold text-fv-cream/70">
                EDITAR
              </button>
            </div>
          </div>
          {editing === p.slug && (
            <div className="mt-3 border-t border-fv-line pt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Nombre</label>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Precio (Bs)</label>
              <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="decimal" className={inputCls} />
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Descripción corta</label>
              <input value={draft.short} onChange={(e) => setDraft({ ...draft, short: e.target.value })} className={inputCls} />
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Descripción larga</label>
              <textarea value={draft.long} onChange={(e) => setDraft({ ...draft, long: e.target.value })} rows={3} className={inputCls} />
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Ruta de imagen (/menu/...)</label>
              <input value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} className={inputCls} />
              <div className="mt-3 flex gap-2">
                <button onClick={() => save(p.slug)} disabled={saving} className="flex-1 rounded-lg bg-fv-orange py-2 text-[11px] font-bold text-fv-black disabled:opacity-50">
                  {saving ? 'GUARDANDO...' : 'GUARDAR'}
                </button>
                <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-fv-line py-2 text-[11px] font-bold text-fv-cream/60">
                  CANCELAR
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ============================== inventory ============================== */

type InventoryItem = AdminProduct

function InventoryBoard({ items, onChanged }: { items: AdminProduct[]; onChanged: () => void }) {
  async function toggle86(it: InventoryItem) {
    await api(T(`/api/admin/menu/${it.slug}`),  { method: 'PATCH', body: JSON.stringify({ soldOut: !it.soldOut }) })
    onChanged()
  }
  async function setThreshold(it: InventoryItem, value: number) {
    await api(T(`/api/admin/menu/${it.slug}`),  { method: 'PATCH', body: JSON.stringify({ auto86Threshold: value }) })
    onChanged()
  }
  return (
    <div className="mt-4 space-y-3">
      <p className="text-[11px] text-fv-cream/50">
        Auto-86: cuando las unidades vendidas hoy llegan al límite, el producto pasa a AGOTADO automáticamente hasta mañana.
      </p>
      {items.map((it) => {
        const soldToday = it.stock?.dailyCount || 0
        const threshold = it.stock?.auto86Threshold || 0
        const auto86 = threshold > 0 && soldToday >= threshold
        const is86 = it.soldOut || auto86
        return (
          <div key={it.slug} className={`rounded-xl border p-3 ${is86 ? 'border-fv-orange/50 bg-fv-orange/5' : 'border-fv-line bg-fv-panel'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-sm font-bold text-fv-cream">{it.name}</div>
                <div className="mt-0.5 text-[11px] text-fv-cream/50">
                  Vendidos hoy: <span className="font-bold text-fv-cream">{soldToday}</span>
                  {threshold > 0 && <> · auto-86 a las {threshold}</>}
                  {auto86 && <span className="ml-2 font-bold text-fv-orange">AUTO-86 ACTIVO</span>}
                  {it.soldOut && <span className="ml-2 font-bold text-fv-orange">86 MANUAL</span>}
                </div>
              </div>
              <button onClick={() => toggle86(it)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold ${is86 ? 'bg-fv-green text-fv-black' : 'bg-fv-orange text-fv-black'}`}>
                {is86 ? 'REPONER' : '86 AHORA'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-fv-cream/40">Auto-86:</span>
              {[0, 10, 15, 20, 30, 50].map((t) => (
                <button
                  key={t}
                  onClick={() => setThreshold(it, t)}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold ${threshold === t ? 'bg-fv-orange text-fv-black' : 'border border-fv-line text-fv-cream/50'}`}
                >
                  {t === 0 ? 'OFF' : t}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============================== promos ============================== */

function PromosManager({ promos, onChanged }: { promos: Promo[]; onChanged: () => void }) {
  const empty = { code: '', type: 'PERCENT' as 'PERCENT' | 'FLAT', value: '', minSubtotal: '', maxUses: '', note: '' }
  const [draft, setDraft] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    setSaving(true)
    setError('')
    const body = {
      code: draft.code.trim(),
      type: draft.type,
      value: draft.type === 'PERCENT' ? parseFloat(draft.value) : Math.round(parseFloat(draft.value) * 100),
      minSubtotal: Math.round((parseFloat(draft.minSubtotal) || 0) * 100),
      maxUses: parseInt(draft.maxUses) || 0,
      note: draft.note.trim() || undefined,
      active: true,
    }
    const res = await api(T('/api/admin/promos'),  { method: 'POST', body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) {
      setError((res.data as { error?: string })?.error || 'Error')
      return
    }
    setDraft(empty)
    onChanged()
  }

  async function remove(code: string) {
    await api(T(`/api/admin/promos?code=${code}`),  { method: 'DELETE' })
    onChanged()
  }

  async function toggle(p: Promo) {
    await api(T('/api/admin/promos'),  { method: 'POST', body: JSON.stringify({ ...p, active: !p.active }) })
    onChanged()
  }

  const inputCls = 'mt-1 w-full rounded-lg border border-fv-line bg-fv-black p-2 text-xs text-fv-cream focus:border-fv-orange focus:outline-none'

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-fv-line bg-fv-panel p-3">
        <div className="font-display text-xs font-bold tracking-wider text-fv-orange">NUEVA PROMO</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">Código</label>
            <input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="CO-PRIMERO" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">Tipo</label>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as 'PERCENT' | 'FLAT' })} className={inputCls}>
              <option value="PERCENT">Porcentaje (%)</option>
              <option value="FLAT">Monto fijo (Bs)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">{draft.type === 'PERCENT' ? 'Descuento %' : 'Descuento Bs'}</label>
            <input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} inputMode="decimal" placeholder={draft.type === 'PERCENT' ? '10' : '5.00'} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">Pedido mínimo Bs (0 = sin mínimo)</label>
            <input value={draft.minSubtotal} onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value })} inputMode="decimal" placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">Usos máximos (0 = ilimitado)</label>
            <input value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} inputMode="numeric" placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-fv-cream/50">Nota interna</label>
            <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="10% primer pedido" className={inputCls} />
          </div>
        </div>
        {error && <div className="mt-2 text-[11px] text-fv-orange">{error}</div>}
        <button onClick={create} disabled={saving} className="mt-3 w-full rounded-lg bg-fv-orange py-2.5 font-display text-xs font-bold text-fv-black disabled:opacity-50">
          {saving ? 'GUARDANDO...' : 'CREAR PROMO'}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {promos.length === 0 && <div className="py-8 text-center text-xs text-fv-cream/30">Sin promos creadas.</div>}
        {promos.map((p) => (
          <div key={p.code} className="flex items-center justify-between rounded-xl border border-fv-line bg-fv-panel p-3">
            <div>
              <div className="font-display text-sm font-black text-fv-cream">
                {p.code} <span className="ml-1 text-xs font-bold text-fv-orange">{p.type === 'PERCENT' ? `${p.value}%` : `Bs ${(p.value / 100).toFixed(2)}`}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-fv-cream/50">
                {p.minSubtotal > 0 ? `mín. Bs ${(p.minSubtotal / 100).toFixed(2)}` : 'sin mínimo'}
                {p.maxUses > 0 ? ` · ${p.usedCount}/${p.maxUses} usos` : ` · ${p.usedCount} usos`}
                {p.note ? ` · ${p.note}` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggle(p)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${p.active ? 'bg-fv-green text-fv-black' : 'border border-fv-line text-fv-cream/40'}`}>
                {p.active ? 'ACTIVA' : 'PAUSADA'}
              </button>
              <button onClick={() => remove(p.code)} className="rounded-lg border border-fv-orange/40 px-2.5 py-1.5 text-[10px] font-bold text-fv-orange">
                BORRAR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================== reports ============================== */

type Reports = {
  today: Sum
  last7: Sum
  last30: Sum
  series: { date: string; revenue: number; orders: number }[]
  liveOrders: Order[]
  stock: string[]
}
type Sum = {
  revenue: number
  deliveryRevenue: number
  discounts: number
  orders: number
  pending: number
  aov: number
  cancelled: number
  paymentMix: { transferenciaPlin: { count: number; revenue: number }; cash: { count: number; revenue: number } }
  topItems: { name: string; qty: number; revenue: number }[]
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-fv-line bg-fv-panel p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-fv-cream/40">{label}</div>
      <div className="mt-1 font-display text-xl font-black text-fv-cream">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-fv-cream/40">{sub}</div>}
    </div>
  )
}

function PeriodBlock({ title, s }: { title: string; s: Sum }) {
  const max = Math.max(1, ...s.topItems.map((t) => t.revenue))
  return (
    <div className="rounded-2xl border border-fv-line bg-fv-panel p-4">
      <div className="font-display text-sm font-black tracking-wider text-fv-orange">{title}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Ingresos" value={formatPEN(s.revenue)} />
        <Stat label="Pedidos" value={String(s.orders)} sub={`${s.cancelled} cancelados · ${s.pending ?? 0} sin pago`} />
        <Stat label="Ticket promedio" value={formatPEN(s.aov)} />
        <Stat label="Delivery" value={formatPEN(s.deliveryRevenue)} sub={`descuentos -${formatPEN(s.discounts)}`} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-fv-black p-2.5">
          <span className="text-fv-cream/40">Transferencia/Plin: </span>
          <span className="font-bold text-fv-cream">{s.paymentMix.transferenciaPlin.count}</span>
          <span className="text-fv-cream/40"> · </span>
          <span className="text-fv-green">{formatPEN(s.paymentMix.transferenciaPlin.revenue)}</span>
        </div>
        <div className="rounded-lg bg-fv-black p-2.5">
          <span className="text-fv-cream/40">Efectivo: </span>
          <span className="font-bold text-fv-cream">{s.paymentMix.cash.count}</span>
          <span className="text-fv-cream/40"> · </span>
          <span className="text-fv-green">{formatPEN(s.paymentMix.cash.revenue)}</span>
        </div>
      </div>
      {s.topItems.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-fv-cream/40">Top productos</div>
          <div className="mt-2 space-y-1.5">
            {s.topItems.slice(0, 5).map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="w-28 shrink-0 truncate text-[11px] text-fv-cream/70">{t.name}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-fv-black">
                  <div className="h-full rounded-full bg-fv-orange" style={{ width: `${Math.max(4, (t.revenue / max) * 100)}%` }} />
                </div>
                <div className="w-16 shrink-0 text-right text-[10px] text-fv-cream/50">{t.qty}u · {formatPEN(t.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReportsView() {
  const [data, setData] = useState<Reports | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      const res = await api(T('/api/admin/reports'))
      if (res.ok) setData(res.data as Reports)
      else setErr(true)
    }
    load()
    const t = setInterval(load, 20000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (err) return <div className="mt-6 text-xs text-fv-orange">Error cargando reportes.</div>
  if (!data) return <div className="mt-6 text-xs text-fv-cream/30">Cargando...</div>

  const maxRev = Math.max(1, ...data.series.map((d) => d.revenue))
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <PeriodBlock title="HOY" s={data.today} />
        <PeriodBlock title="ÚLTIMOS 7 DÍAS" s={data.last7} />
        <PeriodBlock title="ÚLTIMOS 30 DÍAS" s={data.last30} />
      </div>

      <div className="rounded-2xl border border-fv-line bg-fv-panel p-4">
        <div className="font-display text-sm font-black tracking-wider text-fv-orange">INGRESOS · 14 DÍAS</div>
        <div className="mt-3 flex h-24 items-end gap-1">
          {data.series.map((d) => (
            <div key={d.date} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-fv-orange/80 transition-all group-hover:bg-fv-orange"
                style={{ height: `${Math.max(2, (d.revenue / maxRev) * 96)}px` }}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-fv-black px-1.5 py-1 text-[9px] text-fv-cream opacity-0 transition-opacity group-hover:opacity-100">
                {d.date.slice(5)} · {formatPEN(d.revenue)} · {d.orders}p
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-fv-cream/30">
          <span>{data.series[0]?.date.slice(5)}</span>
          <span>hoy</span>
        </div>
      </div>

      <div className="rounded-2xl border border-fv-line bg-fv-panel p-4">
        <div className="font-display text-sm font-black tracking-wider text-fv-orange">EN COCINA AHORA</div>
        {data.liveOrders.length === 0 ? (
          <div className="mt-2 text-xs text-fv-cream/30">Nada en cocina.</div>
        ) : (
          <div className="mt-2 space-y-1.5">
            {data.liveOrders.map((o) => (
              <div key={o.number} className="flex items-center justify-between rounded-lg bg-fv-black px-3 py-2 text-[11px]">
                <span className="font-display font-black text-fv-cream">{o.number}</span>
                <span className="text-fv-cream/50">{o.items.reduce((a, i) => a + i.qty, 0)}u · {o.address.district}</span>
                <span className="font-bold text-fv-orange">{formatPEN(o.total)}</span>
                <span className="rounded bg-fv-panel px-1.5 py-0.5 text-[9px] text-fv-cream/60">{STATUS_LABEL[o.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================== settings ============================== */

function SettingsView({
  capacity,
  hours,
  onSaved,
}: {
  capacity: number
  hours: { hoursOpen: string; hoursClose: string; hoursEnabled: boolean }
  onSaved: () => void
}) {
  const [cap, setCap] = useState(String(capacity))
  const [hOpen, setHOpen] = useState(hours.hoursOpen)
  const [hClose, setHClose] = useState(hours.hoursClose)
  const [hEnabled, setHEnabled] = useState(hours.hoursEnabled)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  async function save() {
    setSaving(true)
    setMsg('')
    const res = await api(T('/api/admin/settings'),  {
      method: 'PATCH',
      body: JSON.stringify({ capacity: parseInt(cap) || 6, hoursOpen: hOpen, hoursClose: hClose, hoursEnabled: hEnabled }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Guardado.')
      onSaved()
    } else {
      setMsg((res.data as { error?: string })?.error || 'Error al guardar')
    }
  }
  return (
    <div className="mt-4 max-w-md space-y-3">
      <div className="rounded-xl border border-fv-line bg-fv-panel p-4">
        <div className="font-display text-sm font-bold text-fv-cream">Horarios de atención</div>
        <p className="mt-1 text-[11px] text-fv-cream/50">
          Todos los días, hora de Bolivia (formato 24h HH:MM). Con el horario activado, la web bloquea pedidos fuera de ese rango.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] text-fv-cream/70">
            <input
              type="checkbox"
              checked={hEnabled}
              onChange={(e) => setHEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#4a7c2f]"
            />
            Activar horario (desactivar = 24 horas)
          </label>
        </div>
        <div className={`mt-2 flex items-center gap-2 ${hEnabled ? '' : 'opacity-40'}`}>
          <input
            value={hOpen}
            onChange={(e) => setHOpen(e.target.value)}
            disabled={!hEnabled}
            placeholder="18:00"
            className="w-20 rounded-lg border border-fv-line bg-fv-black p-2 text-sm text-fv-cream focus:border-fv-orange focus:outline-none"
          />
          <span className="text-xs text-fv-cream/50">a</span>
          <input
            value={hClose}
            onChange={(e) => setHClose(e.target.value)}
            disabled={!hEnabled}
            placeholder="23:00"
            className="w-20 rounded-lg border border-fv-line bg-fv-black p-2 text-sm text-fv-cream focus:border-fv-orange focus:outline-none"
          />
          <button onClick={save} disabled={saving} className="ml-auto rounded-lg bg-fv-orange px-4 text-xs font-bold text-fv-black disabled:opacity-50">
            {saving ? '...' : 'GUARDAR'}
          </button>
        </div>
        {msg && <div className="mt-2 text-[11px] text-fv-green">{msg}</div>}
      </div>
      <div className="rounded-xl border border-fv-line bg-fv-panel p-4">
        <div className="font-display text-sm font-bold text-fv-cream">Capacidad de cocina</div>
        <p className="mt-1 text-[11px] text-fv-cream/50">Pedidos activos máximo por día (no entregados/cancelados). Al llegar al límite, la web avisa &quot;cocina a máxima capacidad&quot;.</p>
        <div className="mt-2 flex gap-2">
          <input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" className="w-24 rounded-lg border border-fv-line bg-fv-black p-2 text-sm text-fv-cream focus:border-fv-orange focus:outline-none" />
          <button onClick={save} disabled={saving} className="rounded-lg bg-fv-orange px-4 text-xs font-bold text-fv-black disabled:opacity-50">
            {saving ? '...' : 'GUARDAR'}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-fv-line bg-fv-panel p-4 text-[11px] leading-relaxed text-fv-cream/50">
        <div className="font-display text-sm font-bold text-fv-cream">Info</div>
        <p className="mt-1">· Pausar pedidos: botón arriba, afecta la web al instante.</p>
        <p>· Los pedidos viejos sin pago (más de 2h) no cuentan para la capacidad.</p>
        <p>· La sesión admin dura hasta cerrar el navegador.</p>
      </div>
    </div>
  )
}

/* ============================== root ============================== */

export default function AdminPage() {
  const tenant = usePathname().split('/')[1]
  __tenant = tenant
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('kitchen')
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [paused, setPaused] = useState(false)
  const [capacity, setCapacity] = useState(6)
  const [hours, setHours] = useState({ hoursOpen: '18:00', hoursClose: '23:00', hoursEnabled: true })

  const loadCore = useCallback(async () => {
    const [ordersRes, settingsRes] = await Promise.all([api(T('/api/admin/orders')), api(T('/api/admin/settings'))])
    if (ordersRes.status === 401) {
      sessionStorage.clear()
      setAuthed(false)
      return
    }
    if (ordersRes.ok) setOrders(ordersRes.data as Order[])
    if (settingsRes.ok) {
      const s = settingsRes.data as { ordersPaused: boolean; capacity: number; hoursOpen: string; hoursClose: string; hoursEnabled: boolean }
      setPaused(s.ordersPaused)
      setCapacity(s.capacity)
      setHours({ hoursOpen: s.hoursOpen, hoursClose: s.hoursClose, hoursEnabled: s.hoursEnabled })
    }
  }, [])

  const loadProducts = useCallback(async () => {
    const res = await api(T('/api/admin/inventory'))
    if (res.ok) setProducts(res.data as AdminProduct[])
  }, [])

  const loadPromos = useCallback(async () => {
    const res = await api(T('/api/admin/promos'))
    if (res.ok) setPromos(res.data as Promo[])
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('fv_admin') === 'ok') setAuthed(true)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    loadCore()
    const t = setInterval(loadCore, 15000)
    return () => clearInterval(t)
  }, [authed, loadCore])

  // lazy-load tab data when a tab is first opened
  useEffect(() => {
    if (!authed) return
    if (tab === 'menu' || tab === 'inventory') loadProducts()
    if (tab === 'promos') loadPromos()
  }, [authed, tab, loadProducts, loadPromos])

  async function patchOrder(number: string, patch: Record<string, string>) {
    await api(T(`/api/admin/orders/${number}`),  { method: 'PATCH', body: JSON.stringify(patch) })
    loadCore()
  }

  async function deleteOrder(number: string) {
    await api(T(`/api/admin/orders/${number}`),  { method: 'DELETE' })
    loadCore()
  }

  async function togglePaused() {
    const next = !paused
    setPaused(next)
    await api(T('/api/admin/settings'),  { method: 'PATCH', body: JSON.stringify({ ordersPaused: next }) })
  }

  async function logout() {
    sessionStorage.clear()
    setAuthed(false)
  }

  if (!ready) return <main className="min-h-dvh" />
  if (!authed) return <Login onOk={() => setAuthed(true)} />

  const activeCount = orders.filter((o) => !['CANCELLED', 'DELIVERED'].includes(o.status)).length

  return (
    <main className="min-h-dvh px-3 pb-16 pt-3 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl font-black text-fv-cream">FV ADMIN</h1>
            {activeCount > 0 && <span className="rounded-full bg-fv-orange px-2 py-0.5 text-[10px] font-black text-fv-black">{activeCount} ACTIVOS</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={togglePaused} className={`rounded-lg px-3 py-2 text-xs font-bold ${paused ? 'bg-fv-green text-fv-black' : 'bg-fv-orange text-fv-black'}`}>
              {paused ? 'REANUDAR PEDIDOS' : 'PAUSAR PEDIDOS'}
            </button>
            <button onClick={logout} className="rounded-lg border border-fv-line px-3 py-2 text-xs font-bold text-fv-cream/50">
              SALIR
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-2 font-display text-[11px] font-bold tracking-wide ${tab === t.id ? 'bg-fv-orange text-fv-black' : 'border border-fv-line bg-fv-panel text-fv-cream/60'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'pos' && <PosTerminal products={products} onCreated={() => { loadCore() }} />}
        {tab === 'kitchen' && <KitchenBoard orders={orders} onPatch={patchOrder} />}
        {tab === 'orders' && <OrdersList orders={orders} onPatch={patchOrder} onDelete={deleteOrder} />}
        {tab === 'menu' && <MenuManager products={products} onChanged={() => { loadProducts(); loadCore() }} />}
        {tab === 'inventory' && <InventoryBoard items={products} onChanged={loadProducts} />}
        {tab === 'promos' && <PromosManager promos={promos} onChanged={loadPromos} />}
        {tab === 'reports' && <ReportsView />}
        {tab === 'settings' && <SettingsView capacity={capacity} hours={hours} onSaved={loadCore} />}
      </div>
    </main>
  )
}