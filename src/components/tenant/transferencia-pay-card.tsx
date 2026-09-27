import Image from 'next/image'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'

const TRANSFERENCIA_HOLDER = 'Cookies Organic'

/** Transferencia payment card: QR + amount + 3-step instruction. Used on receipt + checkout. */
export default function TransferenciaPayCard({ total, compact = false }: { total: number; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#7d3ff2]/50 bg-[#7d3ff2]/10 p-4">
      <div className={`flex items-center gap-4 ${compact ? '' : 'flex-col sm:flex-row'}`}>
        <div className="shrink-0 rounded-xl bg-white p-2">
          <Image
            src="/transferencia-qr.jpg"
            alt="QR de Transferencia para pagar"
            width={compact ? 96 : 140}
            height={compact ? 96 : 140}
            className="h-auto w-[96px] sm:w-auto"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#7d3ff2] px-2 py-0.5 font-display text-[11px] font-black tracking-wider text-white">TRANSFERENCIA</span>
            <span className="font-display text-lg font-black text-fv-cream tabular-nums">{formatPEN(total)}</span>
          </div>
          <div className="mt-1 text-[12px] font-bold text-fv-cream/80">{TRANSFERENCIA_HOLDER}</div>
          <ol className="mt-2 space-y-0.5 text-[11px] text-fv-cream/60">
            <li>1. Escanea el QR con Transferencia o Plin</li>
            <li>2. Paga {formatPEN(total)}</li>
            <li>3. Manda tu captura en el chat</li>
          </ol>
        </div>
      </div>
    </div>
  )
}