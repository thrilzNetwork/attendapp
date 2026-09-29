// ════════════════════════════════════════════════════════════════
//  [tenant] LAYOUT — loads tenant config from the registry, injects
//  the theme as CSS vars, wraps children in the tenant CartProvider.
//  Unknown tenant → clean 404. One template, any brand.
// ════════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation'
import { getTenant, isTenantExpired } from '@/lib/tenant/registry'
import { DemoExpired } from '@/components/tenant/demo-expired'
import { getMenu } from '@/lib/tenant/store'
import { themeVars } from '@/lib/tenant/theme'
import { brandOf } from '@/lib/tenant/registry'
import { BrandProvider } from '@/components/tenant/brand-context'
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

  // 24h demo TTL — expired demos render the lock screen in place of the store
  if (isTenantExpired(cfg)) return <DemoExpired name={cfg.name} />

  const menu: Product[] = await getMenu(cfg.slug)
  const brand = brandOf(cfg)

  return (
    <div style={themeVars(cfg.theme)} data-tenant={cfg.slug}>
      <BrandProvider brand={{ wordA: brand.wordA, wordB: brand.wordB, tagline: (cfg.tagline || ''), botName: brand.botName, slug: cfg.slug }}>
      <CartProvider menu={menu} cartKey={`t_cart_${cfg.slug}`}>
        {children}
      </CartProvider>
      </BrandProvider>
    </div>
  )
}