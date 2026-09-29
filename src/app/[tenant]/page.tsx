import { getMenu, getSettings } from '@/lib/tenant/store'
import { getTenant } from '@/lib/tenant/registry'
import ProductCard from '@/components/tenant/product-card'
import CategoryChips from '@/components/tenant/category-chips'
import HoursClosedBanner, { HoursBadge } from '@/components/tenant/hours-banner'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'
import { ZONES, ORDER_MIN } from '@/lib/tenant/fukin-engine/menu'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const [cfg, products, settings] = await Promise.all([getTenant(tenant), getMenu(tenant), getSettings(tenant)])
  const name = cfg?.name || 'Cookies at Midnight'
  const tagline = cfg?.tagline || 'Horneadas a medianoche · Delivery en Santa Cruz'
  const minBs = ((cfg?.orderMin || ORDER_MIN) / 100).toFixed(0)
  const zone0 = ZONES[0]
  const active = products.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const cats = [...new Set(active.map((p) => p.category))]
  const categories = cats.map((id) => ({ id, name: id }))
  const heroCat = cats[0] || ''
  const hero = active.filter((p) => p.category === heroCat)
  const rest = cats.slice(1)

  return (
    <main className="pb-32">
      {/* DELIVERY BAR (Rappi/UberEats style: location + ETA, no logo block) */}
      <section className="px-4 pt-4">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2 text-[13px] font-bold text-fv-cream">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-fv-orange">
              <path d="M12 21C7 17 3 13.5 3 9a5 5 0 019-3 5 5 0 019 3c0 4.5-4 8-9 12z" />
              <circle cx="12" cy="9" r="2" />
            </svg>
            {zone0 ? zone0.name : 'Santa Cruz'}
            <span className="ml-auto rounded-full bg-fv-green/15 px-2.5 py-1 text-[10px] font-black text-fv-green">
              {zone0 ? `${zone0.minMinutes}-${zone0.maxMinutes} MIN` : '25-40 MIN'}
            </span>
          </div>
          <div className="mt-2">
            <HoursBadge />
          </div>
          <h1 className="mt-2 font-display text-[24px] font-black leading-[1.12] text-fv-cream">
            {name.split(' ').slice(0, -1).join(' ')} <span className="text-fv-orange">{name.split(' ').slice(-1)}</span>
          </h1>
          <p className="mt-1 text-xs text-fv-cream/50">{tagline}</p>
          <HoursClosedBanner />
        </div>
      </section>

      {/* HERO CATEGORY */}
      {hero.length > 0 && (
        <section className="mt-5 px-4">
          <div className="mx-auto max-w-xl">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-base font-black uppercase text-fv-cream">{heroCat}</h2>
              <Link href={`/${tenant}/menu`} className="text-[11px] font-bold text-fv-orange">Ver todo →</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {hero.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROMO STRIP (horizontal scroll like delivery apps) */}
      <section className="mt-4 px-4">
        <div className="mx-auto flex max-w-xl gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          <div className="min-w-[75%] rounded-2xl bg-fv-orange px-4 py-4">
            <div className="font-display text-sm font-black text-fv-black">CAJA FIESTA — 12 cookies Bs 110</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-fv-black/70">La favorita para compartir</div>
          </div>
          <div className="min-w-[75%] rounded-2xl border border-fv-line bg-fv-panel px-4 py-4">
            <div className="font-display text-sm font-black text-fv-cream">Delivery Bs {zone0 ? (zone0.fee / 100).toFixed(2) : '8.00'} en {zone0 ? zone0.name : 'Santa Cruz'}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Mínimo Bs {minBs}</div>
          </div>
        </div>
      </section>

      {/* MENU (all remaining categories, tenant-driven) */}
      <section className="mt-5 px-4">
        <div className="mx-auto max-w-xl">
          <CategoryChips active={heroCat} categories={categories} />
          {settings.ordersPaused ? (
            <div className="mt-4 rounded-xl border border-fv-orange/40 bg-fv-orange/10 p-4 text-sm text-fv-cream">
              Estamos a full — pedidos pausados por ahora.
            </div>
          ) : (
            rest.map((cat) => {
              const items = active.filter((p) => p.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat}>
                  <h2 className="mt-5 font-display text-base font-black uppercase text-fv-cream">{cat}</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {items.map((p) => (
                      <ProductCard key={p.slug} product={p} />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}
