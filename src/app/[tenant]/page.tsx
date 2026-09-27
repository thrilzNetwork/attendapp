import { getMenu, getSettings } from '@/lib/tenant/store'
import ProductCard from '@/components/tenant/product-card'
import CategoryChips from '@/components/tenant/category-chips'
import HoursClosedBanner, { HoursBadge } from '@/components/tenant/hours-banner'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const [products, settings] = await Promise.all([getMenu(tenant), getSettings(tenant)])
  const active = products.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const duos = active.filter((p) => p.category === 'duos')
  const burgers = active.filter((p) => p.category === 'burgers')
  const extras = active.filter((p) => p.category === 'extras')
  const categories = [...new Set(active.map((p) => p.category))].map((id) => ({ id, name: id }))

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
            Santiago de Equipetrol
            <span className="ml-auto rounded-full bg-fv-green/15 px-2.5 py-1 text-[10px] font-black text-fv-green">
              25-35 MIN
            </span>
          </div>
          <div className="mt-2">
            <HoursBadge />
          </div>
          <h1 className="mt-2 font-display text-[24px] font-black leading-[1.12] text-fv-cream">
            ¿Qué te provocas <span className="text-fv-orange">hoy?</span>
          </h1>
          <p className="mt-1 text-xs text-fv-cream/50">Fast food brutal · Alto en proteína · 100% vegano</p>
          <HoursClosedBanner />
        </div>
      </section>

      {/* DUOS */}
      {duos.length > 0 && (
        <section className="mt-5 px-4">
          <div className="mx-auto max-w-xl">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-base font-black uppercase text-fv-cream">Duos</h2>
              <Link href="/app/menu" className="text-[11px] font-bold text-fv-orange">Ver todo →</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {duos.map((p) => (
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
            <div className="font-display text-sm font-black text-fv-black">10% OFF primer pedido</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-fv-black/70">Menciona CO-PRIMERO</div>
          </div>
          <div className="min-w-[75%] rounded-2xl border border-fv-line bg-fv-panel px-4 py-4">
            <div className="font-display text-sm font-black text-fv-cream">Envío Bs5.90 en Equipetrol</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-fv-cream/50">Mínimo Bs20</div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="mt-5 px-4">
        <div className="mx-auto max-w-xl">
          <CategoryChips active={active[0]?.category} categories={categories} />
          {settings.ordersPaused ? (
            <div className="mt-4 rounded-xl border border-fv-orange/40 bg-fv-orange/10 p-4 text-sm text-fv-cream">
              Estamos a full — pedidos pausados por ahora.
            </div>
          ) : (
            <>
              <h2 className="mt-5 font-display text-base font-black uppercase text-fv-cream">Burgers</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {burgers.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
              {extras.length > 0 && (
                <>
                  <h2 className="mt-6 font-display text-base font-black uppercase text-fv-cream">Extras</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {extras.map((p) => (
                      <ProductCard key={p.slug} product={p} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}