
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Product } from '@/lib/tenant/types'
import { formatPEN, lineUnitPrice } from '@/lib/tenant/fukin-engine/pricing'
import { useCart } from '@/components/tenant/cart-context'
import { useHoursGate } from '@/components/tenant/hours-banner'
import { formatHoursRange } from '@/lib/tenant/fukin-engine/hours'

export default function ProductConfigurator({ product }: { product: Product }) {
  const pathname = usePathname()
  const base = '/' + (pathname.split('/')[1] || '')
  const { add } = useCart()
  const hours = useHoursGate()
  const closed = !!hours && hours.hoursEnabled && !hours.isOpenNow
  const [added, setAdded] = useState(false)
  const [mods, setMods] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {}
    for (const g of product.groups) {
      if (g.required && g.type === 'single') init[g.id] = [g.modifiers[0].id]
    }
    return init
  })
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState(1)

  const unit = useMemo(() => lineUnitPrice(product, mods), [product, mods])

  function toggle(groupId: string, type: 'single' | 'multi', modId: string) {
    setMods((prev) => {
      const copy = { ...prev }
      if (type === 'single') {
        copy[groupId] = [modId]
      } else {
        const cur = copy[groupId] || []
        copy[groupId] = cur.includes(modId) ? cur.filter((m) => m !== modId) : [...cur, modId]
      }
      return copy
    })
  }

  function addToCart() {
    add({ slug: product.slug, qty, mods, notes: notes.trim() || undefined })
    setQty(1)
    setNotes('')
    setAdded(true) // stay on the page — user keeps building their order
  }

  return (
    <main className="pb-32">
      {added && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-fv-black/80 p-6" onClick={() => setAdded(false)}>
          <div className="w-full max-w-xs rounded-2xl border border-fv-line bg-fv-panel p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fv-green/15 text-2xl text-fv-green">✓</div>
            <h2 className="mt-3 font-display text-lg font-black text-fv-cream">AGREGADO AL CARRITO</h2>
            <p className="mt-1 text-xs text-fv-cream/50">Suma otra cosa si quieres — el carrito espera.</p>
            <div className="mt-4 space-y-2">
              <Link
                href={`${base}/cart`}
                className="block rounded-xl bg-fv-orange py-3 font-display text-sm font-bold text-fv-black"
              >
                VER CARRITO
              </Link>
              <Link
                href={`${base}/menu`}
                className="block w-full rounded-xl border border-fv-line py-3 text-center font-display text-sm font-bold text-fv-cream"
              >
                SEGUIR PIDIENDO
              </Link>
            </div>
          </div>
        </div>
      )}
      <div className="aspect-[5/4] w-full bg-[#101010]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="mx-auto max-w-xl px-4 pt-5">
        {product.proteinBadge && (
          <span className="mb-2 inline-block rounded-full border border-fv-green/40 bg-fv-green/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-fv-green">
            {product.proteinBadge}
          </span>
        )}
        <h1 className="font-display text-2xl font-black leading-tight text-fv-cream">{product.name}</h1>
        <p className="mt-2 text-sm text-fv-cream/60">{product.long}</p>
        {product.proteinNote && <p className="mt-2 text-[11px] italic text-fv-cream/40">{product.proteinNote}</p>}

        <div className="mt-6 space-y-6">
          {product.groups.map((g) => (
            <div key={g.id}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-sm font-bold text-fv-cream">{g.name}</h2>
                <span className="text-[10px] uppercase tracking-wider text-fv-cream/40">
                  {g.required ? 'REQUERIDO' : 'OPCIONAL'} · {g.type === 'single' ? 'ELIGE 1' : 'ELIGE VARIOS'}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {g.modifiers.map((m) => {
                  const selected = (mods[g.id] || []).includes(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(g.id, g.type, m.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                        selected
                          ? 'border-fv-orange bg-fv-orange/10 text-fv-cream'
                          : 'border-fv-line bg-fv-panel text-fv-cream/80'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span className={m.price ? 'text-fv-orange' : 'text-fv-cream/40'}>
                        {m.price ? `+Bs ${(m.price / 100).toFixed(2)}` : 'Bs 0.00'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div>
            <h2 className="font-display text-sm font-bold text-fv-cream">Notas para la cocina</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. sin gluten del pan, extra tostado..."
              rows={2}
              className="mt-2 w-full rounded-xl border border-fv-line bg-fv-panel p-3 text-sm text-fv-cream placeholder:text-fv-cream/30 focus:border-fv-orange focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-fv-line bg-fv-black/95 p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl gap-3">
          {closed ? (
            <div className="flex-1 rounded-xl border border-fv-orange/40 bg-fv-orange/10 px-4 py-3 text-center">
              <div className="font-display text-sm font-black uppercase tracking-wider text-fv-orange">Cocina cerrada</div>
              <div className="text-[11px] text-fv-cream/60">Atendemos todos los días de {formatHoursRange(hours!.hoursOpen, hours!.hoursClose)}</div>
            </div>
          ) : (
            <>
              <div className="flex items-center rounded-xl border border-fv-line bg-fv-panel">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-3 font-display font-bold text-fv-cream">
                  -
                </button>
                <span className="min-w-8 text-center font-display font-bold text-fv-cream">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="px-4 py-3 font-display font-bold text-fv-cream">
                  +
                </button>
              </div>
              <button
                onClick={addToCart}
                className="flex-1 rounded-xl bg-fv-orange py-4 font-display text-sm font-bold text-fv-black"
              >
                AGREGAR · {formatPEN(unit * qty)}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
