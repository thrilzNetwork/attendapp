
'use client'

import Link from 'next/link'
import { useCart } from '@/components/tenant/cart-context'
import { findProduct, formatPEN, selectedModifierInfo } from '@/lib/tenant/fukin-engine/pricing'


export default function CartPage() {
  const cart = useCart()

  if (cart.lines.length === 0) {
    return (
      <main className="px-4 pb-24 pt-10">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-2xl font-black text-fv-cream">CARRITO VACIO</h1>
          <p className="mt-2 text-sm text-fv-cream/60">No hay nada aqui. Aun.</p>
          <Link href="/app/menu" className="mt-6 inline-block rounded-xl bg-fv-orange px-6 py-4 font-display text-sm font-bold text-fv-black">
            VER MENU
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-32 pt-5">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-black text-fv-cream">TU CARRITO</h1>
        <div className="mt-4 space-y-3">
          {cart.lines.map((line, i) => {
            const product = findProduct(line.slug, cart.menu)
            if (!product) return null
            const info = selectedModifierInfo(product, line.mods)
            return (
              <div key={i} className="rounded-2xl border border-fv-line bg-fv-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-sm font-bold text-fv-cream">{product.name}</div>
                    <div className="mt-1 text-xs text-fv-cream/60">{info.names.length ? info.names.join(' · ') : '—'}</div>
                    {line.notes && <div className="mt-1 text-[11px] italic text-fv-cream/40">"{line.notes}"</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-bold text-fv-orange">
                      {formatPEN(info.extra ? product.price + info.extra : product.price)}
                    </div>
                    <div className="text-[11px] text-fv-cream/40">c/u</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-fv-line">
                    <button onClick={() => cart.setQty(i, line.qty - 1)} className="px-3 py-2 font-display text-fv-cream">-</button>
                    <span className="min-w-6 text-center font-display text-sm font-bold text-fv-cream">{line.qty}</span>
                    <button onClick={() => cart.setQty(i, line.qty + 1)} className="px-3 py-2 font-display text-fv-cream">+</button>
                  </div>
                  <button onClick={() => cart.remove(i)} className="text-xs text-fv-cream/40 underline">Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-fv-line bg-fv-panel p-4">
          <div className="flex justify-between text-sm text-fv-cream/70">
            <span>Subtotal</span>
            <span>{formatPEN(cart.subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-fv-cream/50">
            <span>Delivery</span>
            <span>se calcula al elegir tu distrito</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-fv-line pt-2 font-display text-base font-bold text-fv-cream">
            <span>TOTAL</span>
            <span>{formatPEN(cart.subtotal)}</span>
          </div>
          {cart.subtotal < 30 && (
            <div className="mt-2 text-xs text-fv-orange">
              Minimo de pedido: {formatPEN(30)} (te faltan {formatPEN(30 - cart.subtotal)})
            </div>
          )}
        </div>

        <Link
          href="/app/checkout"
          className={`mt-6 block rounded-xl py-4 text-center font-display text-base font-bold ${
            cart.subtotal >= 30 ? 'bg-fv-orange text-fv-black' : 'pointer-events-none bg-fv-panel text-fv-cream/30'
          }`}
        >
          CONTINUAR
        </Link>
      </div>
    </main>
  )
}
