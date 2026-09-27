'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SEED_PRODUCTS } from '@/lib/tenant/fukin-engine/menu'
import { formatPEN } from '@/lib/tenant/fukin-engine/pricing'

type Msg = { from: 'bot' | 'user'; text: string; cta?: { label: string; href: string } }

const MENU_CTA = { label: 'VER MENU', href: '/app/menu' }
const BEST = SEED_PRODUCTS.filter((p) => p.category === 'burgers').slice(0, 3)

function menuLine(): string {
  return BEST.map((p) => `· ${p.name} — ${formatPEN(p.price)} (${p.short})`).join('\n')
}

function botReply(input: string): { text: string; cta?: { label: string; href: string } } {
  const s = input.toLowerCase()
  if (/(hola|buenas|hey|hi|que tal)/.test(s)) {
    return { text: `¡Qué hay! 🔥 Soy FV Bot. Hoy la gente está pidiendo:\n${menuLine()}\n¿Con cual empiezas?`, cta: MENU_CTA }
  }
  if (/(precio|caro|costo|cuanto)/.test(s)) {
    return { text: `Burgers desde ${formatPEN(Math.min(...SEED_PRODUCTS.map((p) => p.price)))}. Es proteína real, no harina — rinde como un doble de cualquier lado, pero sin bicho 🌱\nMira el menu y compara.`, cta: MENU_CTA }
  }
  if (/(prote[ií]na|proteico|gym|macro)/.test(s)) {
    const best = SEED_PRODUCTS.find((p) => p.proteinBadge)
    return { text: `Aquí ven los que entrenan: ${best?.name || 'la Smash'} tiene el badge ALTO EN PROTEÍNA — ${best ? formatPEN(best.price) : ''}. Plant-based y llena de proteína. El combo con papas suma bien.`, cta: MENU_CTA }
  }
  if (/(vegano|es vegano|animal|huevo|queso)/.test(s)) {
    return { text: "Todo es 100% vegano: cero carne, cero lácteos, cero huevo. El queso es vegetal y el sabor no pide permiso. Hasta los no veganos repiten 😏", cta: MENU_CTA }
  }
  if (/(delivery|env[ií]o|zona|equipetrol|demora|tiempo)/.test(s)) {
    return { text: 'Repartimos en Santiago de Equipetrol en 25-40 min. Pides, te llega el WhatsApp con todo confirmado y la cocina se pone en marcha al instante.', cta: MENU_CTA }
  }
  if (/(pago|transferencia|plin|efectivo|cash)/.test(s)) {
    return { text: 'Aceptas Transferencia, Plin o efectivo al recibir. Eliges al confirmar — sin vueltas.', cta: MENU_CTA }
  }
  if (/(recomien|sugeren|popular|mejor|famosa|que pido|que me pido)/.test(s)) {
    return { text: `La #1 de la casa: *${BEST[0].name}* — ${BEST[0].short}. ${formatPEN(BEST[0].price)} y sale caliente. Pídela antes de que se agote (están volando hoy 🔥).`, cta: { label: `VER ${BEST[0].name.toUpperCase()}`, href: `/app/product/${BEST[0].slug}` } }
  }
  if (/(pedido|orden|comprar|pedir|como)/.test(s)) {
    return { text: 'Fácil: eliges tu burger, la personalizas (salsas, extras), confirmas y tu pedido llega directo por WhatsApp a la cocina. 2 minutos y estás comiendo 🍔', cta: MENU_CTA }
  }
  if (/(gracias|listo|ok|dale|genial)/.test(s)) {
    return { text: '¡Avísame cuando tengas hambre de verdad 😎 El menu te espera!', cta: MENU_CTA }
  }
  const match = SEED_PRODUCTS.find((p) => s.includes(p.name.toLowerCase().split(' ')[0]))
  if (match) {
    return { text: `*${match.name}* — ${match.short}. ${formatPEN(match.price)}. Puedes personalizarla con salsas y extras. ¿La armo?`, cta: { label: 'ARMAR MI BURGER', href: `/app/product/${match.slug}` } }
  }
  return { text: 'Pregúntame por precios, zonas, pagos o déjame mostrarte lo más pedido 🔥', cta: MENU_CTA }
}

const QUICK = ['Que me recomiendas?', 'Es 100% vegano?', 'Zonas de delivery', 'Aceptan Transferencia?', 'Cuanto tarda?']

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ from: 'bot', text: `¡Hey! 👋 Antes de que te vayas: hoy las burgers están volando 🔥\n${menuLine()}\n¿Te armo una?`, cta: MENU_CTA }])
    }
  }, [open, msgs.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  function send(text: string) {
    const clean = text.trim()
    if (!clean) return
    const userMsg: Msg = { from: 'user', text: clean }
    const reply = botReply(clean)
    setMsgs((m) => [...m, userMsg, { from: 'bot', text: reply.text, cta: reply.cta }])
    setInput('')
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-fv-orange shadow-lg shadow-fv-orange/30 active:scale-95 md:bottom-6"
          aria-label="Chat"
        >
          <span className="font-display text-xl font-black text-fv-black">?</span>
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fv-green text-[10px] font-black text-fv-black">1</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[70dvh] flex-col overflow-hidden rounded-2xl border border-fv-line bg-fv-black shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:w-96">
          <div className="flex items-center justify-between border-b border-fv-line bg-fv-panel px-4 py-3">
            <div>
              <div className="font-display text-sm font-black text-fv-cream">FV BOT</div>
              <div className="text-[10px] text-fv-green">● en linea — responde al toque</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-fv-cream/40" aria-label="Cerrar">✕</button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? '' : 'text-right'}>
                <div
                  className={`inline-block max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.from === 'bot' ? 'bg-fv-panel text-fv-cream' : 'bg-fv-orange text-fv-black'
                  }`}
                >
                  {m.text}
                </div>
                {m.cta && (
                  <Link href={m.cta.href} onClick={() => setOpen(false)} className="mt-1 block rounded-lg bg-fv-orange py-2 text-center font-display text-[11px] font-bold text-fv-black">
                    {m.cta.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-t border-fv-line px-3 py-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-fv-line bg-fv-panel px-3 py-1.5 text-[10px] text-fv-cream/70">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-fv-line px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Escribe aqui..."
              className="w-full rounded-xl bg-fv-panel px-3 py-2.5 text-xs text-fv-cream placeholder:text-fv-cream/30 focus:outline-none"
            />
            <button onClick={() => send(input)} className="rounded-xl bg-fv-orange px-3 py-2.5 font-display text-xs font-bold text-fv-black">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}