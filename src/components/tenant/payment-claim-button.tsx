'use client'

import { useState } from 'react'
import { tenantApi } from '@/lib/tenant/base-path'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

/** Customer confirms they sent the Transferencia/Plin capture — flags the order for admin. */
export default function PaymentClaimButton({ orderNumber }: { orderNumber: string }) {
  const tenant = usePathname().split('/')[1]
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function claim() {
    setSending(true)
    setError('')
    try {
      const res = await fetch(tenantApi(tenant, `/api/orders/${orderNumber}/claim`),  { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al avisar')
      }
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al avisar')
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={claim}
        disabled={sending}
        className="block w-full rounded-xl border border-fv-green/40 bg-fv-green/10 py-4 text-center font-display text-sm font-bold text-fv-green disabled:opacity-50"
      >
        {sending ? 'ENVIANDO...' : 'YA ENVIE MI PAGO'}
      </button>
      {error && <div className="mt-2 text-center text-[11px] text-fv-orange">{error}</div>}
    </>
  )
}