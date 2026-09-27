
import { Product, CartLine, Modifier } from '../types'

export function findProduct(slug: string, menu: Product[]): Product | undefined {
  return menu.find((p) => p.slug === slug)
}

export function selectedModifierInfo(
  product: Product,
  mods: Record<string, string[]>
): { names: string[]; extra: number } {
  const names: string[] = []
  let extra = 0
  // legacy clients sent mods as a plain array of modifier ids — coerce to a
  // group-keyed map (or ignore unknown shapes) instead of crashing
  const normalized: Record<string, string[]> =
    Array.isArray(mods)
      ? { sabor: (mods as unknown as string[]).filter((x) => typeof x === 'string') }
      : mods && typeof mods === 'object'
        ? mods
        : {}
  for (const group of product.groups) {
    const chosen = normalized[group.id] || []
    for (const modId of chosen) {
      const mod: Modifier | undefined = group.modifiers.find((m) => m.id === modId)
      if (!mod) continue
      if (mod.price > 0) {
        extra += mod.price
        names.push(`${mod.name} (+Bs${(mod.price / 100).toFixed(2)})`)
      } else if (group.id === 'sabor') {
        names.push(mod.name)
      } else if (!mod.name.startsWith('Sin ') && !['c-solo', 'sp-ninguna'].includes(mod.id)) {
        // neutral selections (required defaults) still listed for kitchen clarity
        names.push(mod.name)
      }
    }
  }
  return { names, extra }
}

export function lineUnitPrice(product: Product, mods: Record<string, string[]>): number {
  return product.price + selectedModifierInfo(product, mods).extra
}

export function lineTotal(line: CartLine, menu: Product[]): number {
  const product = findProduct(line.slug, menu)
  if (!product) return 0
  return lineUnitPrice(product, line.mods) * line.qty
}

export function formatPEN(cents: number): string {
  return `Bs ${(cents / 100).toFixed(2)}`
}

export const formatMoney = formatPEN
