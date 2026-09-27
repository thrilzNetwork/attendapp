'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function CategoryChips({ active, categories }: { active?: string; categories: { id: string; name: string }[] }) {
  const tenant = usePathname().split('/')[1]
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/${usePathname().split('/')[1]}/menu`}
          className={`shrink-0 rounded-full border px-4 py-2 font-display text-xs font-bold ${
            active === c.id ? 'border-fv-orange bg-fv-orange text-fv-black' : 'border-fv-line bg-fv-panel text-fv-cream/80'
          }`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  )
}
