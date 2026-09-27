import { Order } from '../types'
import type { TenantConfig } from '../registry'
import { formatMoney } from './pricing'

const PAY_LABEL: Record<string, string> = {
  TRANSFERENCIA_QR: 'Transferencia / Plin (envia tu captura)',
  CASH: 'Efectivo al recibir',
}

/** Detailed, kitchen-ready WhatsApp order message. */
export function buildWhatsAppMessage(order: Order, cfg: TenantConfig): string {
  const L: string[] = []
  L.push(`*${cfg.name.toUpperCase()} — NUEVO PEDIDO ${order.number}*`)
  L.push('━━━━━━━━━━━━━━')
  L.push(`*CLIENTE:* ${order.customer.firstName}`)
  L.push(`*CELULAR:* ${order.customer.phone}`)
  L.push('━━━━━━━━━━━━━━')
  L.push('*PEDIDO:*')
  for (const it of order.items) {
    L.push(`• ${it.qty}x ${it.name} — ${formatMoney(it.lineTotal)}${it.kind === 'upsell' ? ' (EXTRA)' : ''}`)
    if (it.mods.length) L.push(`   ↳ ${it.mods.join(' · ')}`)
    if (it.notes) L.push(`   ↳ Nota: "${it.notes}"`)
  }
  L.push('━━━━━━━━━━━━━━')
  L.push(`*SUBTOTAL:* ${formatMoney(order.subtotal)}`)
  L.push(`*DELIVERY (${order.address.district}):* ${formatMoney(order.deliveryFee)}`)
  if (order.promoCode && order.discount) L.push(`*PROMO ${order.promoCode}:* -${formatMoney(order.discount)}`)
  L.push(`*TOTAL:* ${formatMoney(order.total)}`)
  L.push(`*PAGO:* ${PAY_LABEL[order.paymentMethod] || order.paymentMethod}`)
  if (order.scheduledFor) L.push(`*ENTREGA PROGRAMADA:* ${order.scheduledFor} (pedido adelantado)`)
  if (order.paymentMethod === 'TRANSFERENCIA_QR') L.push('👉 Paga al QR Transferencia en la página de tu pedido y manda tu captura aqui.')
  L.push('━━━━━━━━━━━━━━')
  L.push('*ENTREGAR EN:*')
  L.push(`${order.address.street}${order.address.apartment ? ', ' + order.address.apartment : ''}`)
  L.push(`${order.address.district}`)
  if (order.address.reference) {
    // Customer often types "Ref: ..." themselves — strip it so we don't double-prefix
    const ref = order.address.reference.replace(/^\s*Ref:?\s*/i, '')
    if (ref) L.push(`Ref: ${ref}`)
  }
  if (order.notes) L.push(`Notas: ${order.notes}`)
  L.push('━━━━━━━━━━━━━━')
  L.push('_powered by attenda technologies_')
  L.push('https://attendaapp.com/serve')
  return L.join('\n')
}

export function waLink(message: string, cfg: TenantConfig): string {
  return `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(message)}`
}