import { getMenu } from '@/lib/tenant/store'
import { getTenant } from '@/lib/tenant/registry'
import { SEED_ZONES } from '@/lib/tenant/fukin-engine/seed-menu'
import ProductCard from '@/components/tenant/product-card'
import CategoryChips from '@/components/tenant/category-chips'

export const dynamic = 'force-dynamic'

export default async function MenuPage({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const products = await getMenu(tenant)
  const categories = [...new Set(products.filter((p) => p.active).map((p) => p.category))].map((id) => ({ id, name: id }))
  return (
    <main className="px-4 pb-32 pt-5">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-[26px] font-black leading-none text-fv-cream">
          Menú
        </h1>
        <div className="sticky top-0 z-20 -mx-4 mt-3 bg-fv-black/90 px-4 py-2.5 backdrop-blur-md">
          <CategoryChips categories={categories} />
        </div>
        {categories.map((cat) => {
          const items = products
            .filter((p) => p.category === cat.id && p.active)
            .sort((a, b) => a.sortOrder - b.sortOrder)
          if (!items.length) return null
          return (
            <section key={cat.id} className="mt-5" id={`c-${cat.id}`}>
              <h2 className="font-display text-sm font-black uppercase tracking-wider text-fv-cream/80">{cat.name}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {items.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}