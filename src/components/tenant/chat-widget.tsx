'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBrand } from './brand-context'

type Msg = { from: 'bot' | 'user'; text: string; cta?: { label: string; href: string } }
type Prod = { slug: string; name: string; short: string; price: number; category?: string }

const fmt = (c: number) => `Bs ${(c / 100).toFixed(2)}`

function tenantBase(pathname: string): string {
  const seg = pathname.split('/')[1]
  return seg ? `/${seg}` : ''
}

function makeBot(menu: Prod[], base: string, botName: string, zone: string, eta: string) {
  const MENU_CTA = { label: 'VER MENU', href: `${base}/menu` }
  const BEST = menu.filter((p) => p.category === 'cookies' || !p.category).slice(0, 3)
  const bestList = BEST.length ? BEST : menu.slice(0, 3)

  function menuLine(): string {
    return bestList.map((p) => `· ${p.name} — ${fmt(p.price)} (${p.short})`).join('\n')
  }

  function botReply(input: string): { text: string; cta?: { label: string; href: string } } {
    const s = input.toLowerCase()
    if (/(hola|buenas|hey|hi|que tal)/.test(s)) {
      return { text: `¡Qué hay! 🔥 Soy ${botName.charAt(0) + botName.slice(1).toLowerCase()}. Hoy la gente está pidiendo:\n${menuLine()}\n¿Con cual empiezas?`, cta: MENU_CTA }
    }
    if (/(precio|caro|costo|cuanto)/.test(s)) {
      return { text: `Cookies desde ${fmt(Math.min(...menu.map((p) => p.price)))}. Ingredientes orgánicos de verdad — masa fermentada, nada artificial 🌙\nMira el menu y compara.`, cta: MENU_CTA }
    }
    if (/(organi|ingredien|mantequilla|chips)/.test(s)) {
      return { text: 'Todo es 100% orgánico: masa fermentada, mantequilla real, chips de chocolate de verdad. Nada artificial,Horneado la noche misma. 🌙', cta: MENU_CTA }
    }
    if (/(delivery|env[ií]o|zona|equipetrol|demora|tiempo)/.test(s)) {
      return { text: `Repartimos en ${zone} en ${eta}. Pides, te llega el WhatsApp con todo confirmado y el horno se enciende al instante.`, cta: MENU_CTA }
    }
    if (/(pago|transferencia|qr|plin|efectivo|cash)/.test(s)) {
      return { text: 'Aceptamos Transferencia, QR o efectivo al recibir. Eliges al confirmar — sin vueltas.', cta: MENU_CTA }
    }
    if (/(recomien|sugeren|popular|mejor|famosa|que pido|que me pido)/.test(s)) {
      const b = bestList[0]
      return { text: `La #1 de la casa: *${b.name}* — ${b.short}. ${fmt(b.price)} y salen calientes. Pídelas antes de que se agoten (están volando hoy 🔥).`, cta: { label: `VER ${b.name.toUpperCase()}`, href: `${base}/product/${b.slug}` } }
    }
    if (/(pedido|orden|comprar|pedir|como)/.test(s)) {
      return { text: 'Fácil: eliges tus cookies, las personalizas (extras, bebidas), confirmas y tu pedido llega directo por WhatsApp a la cocina. 2 minutos y estás comiendo 🍪', cta: MENU_CTA }
    }
    if (/(gracias|listo|ok|dale|genial)/.test(s)) {
      return { text: '¡Avísame cuando tengas antojo de verdad 😎 El menu te espera!', cta: MENU_CTA }
    }
    const match = menu.find((p) => s.includes(p.name.toLowerCase().split(' ')[0]))
    if (match) {
      return { text: `*${match.name}* — ${match.short}. ${fmt(match.price)}. Puedes personalizarla con extras y bebidas. ¿La armo?`, cta: { label: 'ARMAR MI CAJA', href: `${base}/product/${match.slug}` } }
    }
    return { text: 'Pregúntame por precios, zonas, pagos o déjame mostrarte lo más pedido 🔥', cta: MENU_CTA }
  }

  const QUICK = ['Que me recomiendas?', 'Es 100% organico?', 'Zonas de delivery', 'Aceptan QR?', 'Cuanto tarda?']

  function greeting(): Msg {
    return { from: 'bot', text: `¡Hey! 👋 Antes de que te vayas: hoy las cookies están volando 🔥\n${menuLine()}\n¿Te armo una caja?`, cta: MENU_CTA }
  }

  return { botReply, QUICK, greeting }
}

export default function ChatWidget({ menu }: { menu: Prod[] }) {
  const brand = useBrand()
  const pathname = usePathname()
  const base = tenantBase(pathname)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const bot = makeBot(menu.length ? menu : [{ slug: 'x', name: 'Cookies', short: 'orgánicas', price: 1200, category: 'cookies' }], base, brand.botName || 'MIDNIGHT BOT', 'Equipetrol', '25-40 min')

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([bot.greeting()])
    }
  }, [open, msgs.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  function send(text: string) {
    const clean = text.trim()
    if (!clean) return
    const userMsg: Msg = { from: 'user', text: clean }
    const reply = bot.botReply(clean)
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
              <div className="font-display text-sm font-black text-fv-cream">{brand.botName}</div>
              <div className="text-[10px] text-fv-green">● en linea — responde al toque</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-fv-cream/40" aria-label="Cerrar">✕</button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? 'max-w-[85%] rounded-2xl rounded-bl-sm bg-fv-panel px-3 py-2' : 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-fv-orange px-3 py-2 text-fv-black'}>
                <div className="whitespace-pre-line text-[12px] leading-relaxed">{m.text}</div>
                {m.cta && (
                  <Link href={m.cta.href} onClick={() => setOpen(false)} className="mt-1 block rounded-lg bg-fv-orange py-2 text-center font-display text-[11px] font-bold text-fv-black">
                    {m.cta.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-fv-line px-3 py-2">
            {bot.QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-fv-line px-2.5 py-1 text-[10px] text-fv-cream/70 transition-colors hover:border-fv-orange hover:text-fv-orange">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-fv-line bg-fv-panel p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input) }}
              placeholder="Escribe tu antojo…"
              className="flex-1 rounded-xl border border-fv-line bg-fv-black px-3 py-2 text-[12px] text-fv-cream outline-none placeholder:text-fv-cream/30 focus:border-fv-orange"
            />
            <button onClick={() => send(input)} className="rounded-xl bg-fv-orange px-4 py-2 font-display text-[12px] font-black text-fv-black" aria-label="Enviar">➤</button>
          </div>
        </div>
      )}
    </>
  )
}
