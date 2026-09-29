// ════════════════════════════════════════════════════════════════
//  DEMO EXPIRED SCREEN — full-page lock shown when a 24h demo TTL
//  lapses (status 'demo' + expiresAt in the past). Rendered by the
//  tenant layout in place of children; admin APIs 403 in parallel.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link'

export function DemoExpired({ name }: { name: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] px-5 text-[#f5f2e9]">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#232323] bg-[#131313] text-3xl">
          ⏳
        </div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em] text-[#85a80d]">Attenda · Demo 24h</div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">Tu demo terminó</h1>
        <p className="mb-2 text-[15px] leading-relaxed text-[#f5f2e9]/70">
          La demo de <span className="font-semibold text-[#f5f2e9]">{name}</span> funcionó por 24 horas completas
          y ahora está pausada.
        </p>
        <p className="mb-8 text-[15px] leading-relaxed text-[#f5f2e9]/70">
          Todo lo que configuraste sigue guardado — activa tu tienda para volver a operar
          tal cual la dejaste, o crea una demo nueva desde cero.
        </p>
        <div className="space-y-3">
          <Link href="/serve"
            className="block rounded-xl bg-[#f36a12] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110">
            Activa tu tienda — conoce Attenda
          </Link>
          <Link href="/onboard"
            className="block rounded-xl border border-[#232323] bg-[#131313] px-6 py-3.5 text-[15px] font-semibold text-[#f5f2e9]/90 transition hover:border-[#85a80d]">
            Crear una demo nueva
          </Link>
        </div>
      </div>
    </div>
  )
}