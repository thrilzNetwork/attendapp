'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Product, CartLine } from '@/lib/tenant/types'

type CartCtx = {
  lines: CartLine[]
  add: (line: CartLine) => void
  setQty: (index: number, qty: number) => void
  remove: (index: number) => void
  clear: () => void
  count: number
  subtotal: number
  menu: Product[]
  cartKey: string
}

const Ctx = createContext<CartCtx | null>(null)

const lineKey = (l: CartLine) => JSON.stringify([l.slug, l.mods, l.notes || ''])

const findProductIn = (menu: Product[], slug: string): Product | undefined =>
  menu.find((p) => p.slug === slug)

function readPersisted(menu: Product[], cartKey: string): CartLine[] {
  try {
    const raw = localStorage.getItem(cartKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartLine[]
    return parsed.filter((l) => findProductIn(menu, l.slug))
  } catch {
    return []
  }
}

export function CartProvider({
  children,
  menu,
  cartKey = 't_cart',
}: {
  children: React.ReactNode
  menu: Product[]
  cartKey?: string
}) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLines(readPersisted(menu, cartKey))
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, cartKey])

  useEffect(() => {
    if (hydrated) localStorage.setItem(cartKey, JSON.stringify(lines))
  }, [lines, hydrated, cartKey])

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((acc, l) => {
      const p = findProductIn(menu, l.slug)
      if (!p) return acc
      const unit = p.price + (l.mods ? modExtra(p, l.mods) : 0)
      return acc + unit * l.qty
    }, 0)
    const count = lines.reduce((acc, l) => acc + l.qty, 0)
    return {
      lines,
      add: (line) => {
        const k = lineKey(line)
        setLines((prev) => {
          const i = prev.findIndex((l) => lineKey(l) === k)
          if (i === -1) return [...prev, line]
          const next = [...prev]
          next[i] = { ...next[i], qty: next[i].qty + line.qty }
          return next
        })
      },
      setQty: (index, qty) =>
        setLines((prev) =>
          qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, qty } : l))
        ),
      remove: (index) => setLines((prev) => prev.filter((_, i) => i !== index)),
      clear: () => setLines([]),
      count,
      subtotal,
      menu,
      cartKey,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, hydrated, menu, cartKey])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart outside provider')
  return ctx
}

// per-product modifier extra from the fukin engine's group math (client mirror of pricing.ts)
import { selectedModifierInfo } from '@/lib/tenant/fukin-engine/pricing'
function modExtra(p: Product, mods: Record<string, string[]>): number {
  return selectedModifierInfo(p, mods).extra
}
