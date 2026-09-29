'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from './cart-context'
import FvLogo from './fv-logo'

function tenantBase(pathname: string): string {
  const seg = pathname.split('/')[1]
  return seg ? `/${seg}` : ''
}

export function SiteHeader() {
  const pathname = usePathname()
  const base = tenantBase(pathname)
  return (
    <header className="sticky top-0 z-40 border-b border-fv-line bg-fv-black/90 backdrop-blur">
      <div className="mx-auto max-w-xl px-4 py-3">
        {/* Mobile-first: single-row header, logo takes the stage (search removed) */}
        <div className="flex items-center justify-between">
          <FvLogo size="md" href={base ? `${base}/menu` : '/'} />
        </div>
      </div>
    </header>
  )
}

export function CartBar() {
  const { count, subtotal } = useCart()
  const pathname = usePathname()
  const base = tenantBase(pathname)
  if (count === 0) return null
  // Hide on cart/checkout/receipt AND product pages: product pages have their
  // own bottom AGREGAR bar — a VER CARRITO bar at the same z-index paints over
  // it and swallows the tap (user can never add a second item).
  if (pathname.endsWith('/cart') || pathname.endsWith('/checkout') || /\/order\//.test(pathname) || /\/product\//.test(pathname)) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-xl">
        <Link
          href={`${base}/cart`}
          className="flex items-center justify-between rounded-2xl bg-fv-orange px-5 py-3.5 font-display text-sm font-black text-fv-black shadow-lg"
        >
          <span>VER CARRITO · {count}</span>
          <span>Bs {(subtotal / 100).toFixed(2)}</span>
        </Link>
      </div>
    </div>
  )
}
