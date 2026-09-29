'use client'

import { createContext, useContext } from 'react'

export type BrandCtx = { wordA: string; wordB: string; tagline: string; botName: string; slug: string }

const Ctx = createContext<BrandCtx>({ wordA: 'COOKIES', wordB: 'ORGANIC', tagline: '', botName: 'MIDNIGHT BOT', slug: '' })

export function BrandProvider({ brand, children }: { brand: BrandCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={brand}>{children}</Ctx.Provider>
}

export function useBrand(): BrandCtx {
  return useContext(Ctx)
}
