import Link from 'next/link'
import { Product } from '@/lib/tenant/types'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'

export default function ProductCard({ product }: { product: Product }) {
  const unavailable = product.soldOut || !product.active
  return (
    <Link
      href={`/app/product/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-fv-line bg-fv-panel transition-transform active:scale-[0.98] ${unavailable ? 'opacity-60' : ''}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#101010]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className={`h-full w-full object-cover ${unavailable ? 'grayscale' : ''}`} />
        {product.proteinBadge && (
          <span className="absolute left-2 top-2 rounded-full bg-fv-black/80 px-2 py-1 text-[9px] font-black uppercase text-fv-green backdrop-blur-sm">
            {product.proteinBadge}
          </span>
        )}
        {product.soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-fv-orange py-1 text-center font-display text-[9px] font-black tracking-wider text-fv-black">
            AGOTADO
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <div className="truncate font-display text-[14px] font-bold leading-tight text-fv-cream">{product.name}</div>
        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-fv-cream/50">{product.short}</div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className={`font-display text-[15px] font-black ${unavailable ? 'text-fv-cream/40' : 'text-fv-orange'}`}>{formatPEN(product.price)}</span>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-bold leading-none ${unavailable ? 'bg-fv-panel text-fv-cream/30' : 'bg-fv-orange text-fv-black'}`}
          >
            +
          </span>
        </div>
      </div>
    </Link>
  )
}