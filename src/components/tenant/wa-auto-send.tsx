'use client'

import { useEffect } from 'react'

/**
 * After checkout creates the order, this fires once: on mobile it opens
 * WhatsApp (pre-filled detailed order message) while the receipt page stays
 * in the browser; on desktop it stays quiet and the user taps the big button.
 */
export default function WaAutoSend({ orderNumber, waLink }: { orderNumber: string; waLink: string }) {
  useEffect(() => {
    let pending: string | null = null
    try {
      pending = sessionStorage.getItem('fv_wa_auto')
      if (pending === orderNumber) sessionStorage.removeItem('fv_wa_auto')
      else pending = null
    } catch {}
    if (!pending) return
    const t = setTimeout(() => {
      window.location.href = waLink
    }, 600)
    return () => clearTimeout(t)
  }, [orderNumber, waLink])
  return null
}