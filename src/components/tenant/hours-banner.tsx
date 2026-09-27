'use client'

import { tenantApi } from '@/lib/tenant/base-path'
import { usePathname } from 'next/navigation'

import { useEffect, useState } from 'react'


type Hours = {
  hoursEnabled: boolean
  hoursOpen: string
  hoursClose: string
  isOpenNow: boolean
}

let cache: Hours | null = null

function fmt(t: string): string {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t)
  if (!m) return t
  const h24 = parseInt(m[1], 10)
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${m[2]} ${period}`
}

/** Small inline 'Abierto · 6:00 PM – 11:00 PM' pill. Renders nothing while loading or 24h mode. */
export function HoursBadge() {
  const tenant = usePathname().split('/')[1]
  const [h, setH] = useState<Hours | null>(cache)
  useEffect(() => {
    if (cache) return
    let alive = true
    fetch(tenantApi(tenant, '/api/store/hours'))
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        cache = d
        setH(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!h || !h.hoursEnabled) return null
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
        h.isOpenNow ? 'border-fv-green/40 bg-fv-green/10 text-fv-green' : 'border-fv-line bg-fv-panel text-fv-cream/60'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${h.isOpenNow ? 'bg-fv-green' : 'bg-fv-orange'}`} />
      {h.isOpenNow ? `Abierto · ${fmt(h.hoursOpen)} – ${fmt(h.hoursClose)}` : `Cerrado · Abrimos ${fmt(h.hoursOpen)}`}
    </span>
  )
}

/** Full-width banner shown ONLY when the kitchen is closed right now. */
export default function HoursClosedBanner() {
  const tenant = usePathname().split('/')[1]
  const [h, setH] = useState<Hours | null>(cache)
  useEffect(() => {
    if (cache) return
    let alive = true
    fetch(tenantApi(tenant, '/api/store/hours'))
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        cache = d
        setH(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!h || h.isOpenNow || !h.hoursEnabled) return null
  return (
    <div className="mt-4 rounded-2xl border border-fv-orange/40 bg-fv-orange/10 px-4 py-3 text-center">
      <div className="font-display text-sm font-black uppercase tracking-wider text-fv-orange">Cocina cerrada ahora</div>
      <div className="mt-1 text-[11px] text-fv-cream/60">
        Atendemos todos los días de {fmt(h.hoursOpen)} – {fmt(h.hoursClose)}.
      </div>
    </div>
  )
}

/** Configurator state: open = normal; closed = blocks 'AGREGAR' with the reason. */
export function useHoursGate() {
  const tenant = usePathname().split('/')[1]
  const [h, setH] = useState<Hours | null>(cache)
  useEffect(() => {
    if (cache) return
    let alive = true
    fetch(tenantApi(tenant, '/api/store/hours'))
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        cache = d
        setH(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return h
}