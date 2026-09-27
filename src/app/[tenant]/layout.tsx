// ════════════════════════════════════════════════════════════════
//  [tenant] LAYOUT — loads tenant config from the registry, injects
//  the theme as CSS vars, wraps children in the tenant CartProvider.
//  Unknown tenant → clean 404. One template, any brand.
// ════════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant/registry'
import { getMenu } from '@/lib/tenant/store'
import { themeVars } from '@/lib/tenant/theme'
import { CartProvider } from '@/components/tenant/cart-context'
import type { Product } from '@/lib/tenant/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { tenant: string } }) {
  const cfg = await getTenant(params.tenant)
  return {
    title: cfg ? `${cfg.name} — Pedidos` : 'Attenda',
    description: cfg?.tagline || 'Pedidos por WhatsApp',
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tenant: string }
}) {
  const { tenant } = params
  const cfg = await getTenant(tenant)
  if (!cfg) notFound()

  const menu: Product[] = await getMenu(cfg.slug)

  return (
    <div style={themeVars(cfg.theme)} data-tenant={cfg.slug}>
      <CartProvider menu={menu} cartKey={`t_cart_${cfg.slug}`}>
        {children}
      </CartProvider>
    </div>
  )
}