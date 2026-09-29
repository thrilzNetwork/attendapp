'use client'

// ════════════════════════════════════════════════════════════════
//  ONBOARDING WIZARD — /onboard
//  Multi-step form (form-style, one thing per screen). A prospect
//  enters their brand + items and gets a REAL 24h demo tenant on
//  the same fukin template: their colors, their wordmark, their
//  menu, working admin. Lives behind the corporate site chrome.
// ════════════════════════════════════════════════════════════════

import { useState } from 'react'
import Link from 'next/link'

type WizardItem = { name: string; price: string; category: string; description: string }

type Done = {
  slug: string; url: string; menuUrl: string; adminUrl: string
  adminPassword: string; expiresAt: string
}

const CATS = ['Menú', 'Cajas', 'Bebidas', 'Postres', 'Comida', 'Extras']

const STEPS = ['Tu marca', 'Tu estilo', 'Tu menú', 'Listo']

export default function OnboardWizard() {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<Done | null>(null)

  // step 0 — brand basics
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [instagram, setInstagram] = useState('')

  // step 1 — style
  const [tagline, setTagline] = useState('')
  const [primary, setPrimary] = useState('#FFB800')
  const [accent, setAccent] = useState('#8B5CF6')

  // step 2 — menu
  const [items, setItems] = useState<WizardItem[]>([
    { name: '', price: '', category: 'Menú', description: '' },
  ])
  const [brandLine, setBrandLine] = useState('')

  function next() { setStep((s) => Math.min(3, s + 1)) }
  function back() { setStep((s) => Math.max(0, s - 1)) }

  function setItem(i: number, patch: Partial<WizardItem>) {
    setItems((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  }

  async function submit() {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/tenant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, whatsapp, city, tagline, instagram, primary, accent,
          brandLine,
          items: items
            .filter((i) => i.name.trim() && i.price.trim())
            .map((i) => ({ name: i.name.trim(), price: Number(i.price), category: i.category, description: i.description.trim() || undefined })),
          hours: { opens: '09:00', closes: '22:00' },
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Error creando la demo')
      setDone(d)
      setStep(3)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error creando la demo')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10'
  const labelCls = 'block text-[13px] font-semibold uppercase tracking-wide text-neutral-500'

  const canNext0 = name.trim().length >= 2 && whatsapp.trim().length >= 7
  const canNext1 = primary.startsWith('#') && accent.startsWith('#')
  const canSubmit = true // at least 0 items = cookie seed fallback is fine for demo

  if (done) {
    const exp = new Date(done.expiresAt)
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl">
          <div className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-emerald-600">Demo creada</div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mb-6 text-[15px] text-neutral-600">
            Tu demo está viva por 24 horas (hasta las {exp.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}).
            Pruébala completa — todo lo que veas es exactamente lo que operas al activar.
          </p>
          <div className="mb-6 space-y-2.5">
            {[
              ['Tu página', done.url],
              ['Tu menú', done.menuUrl],
              ['Tu admin', done.adminUrl],
            ].map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer"
                 className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:border-neutral-900">
                <span className="text-[15px] font-medium">{label}</span>
                <span className="text-[13px] text-neutral-500">{url.replace('https://', '')} →</span>
              </a>
            ))}
          </div>
          <div className="rounded-xl bg-neutral-50 px-4 py-3 text-[14px] text-neutral-700">
            <span className="font-semibold">Clave admin:</span>{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">{done.adminPassword}</code>
          </div>
          <Link href={done.url} className="mt-6 block rounded-xl bg-neutral-900 py-3.5 text-center text-[15px] font-semibold text-white transition hover:bg-neutral-800">
            Abrir mi demo →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-neutral-50">
      <div className="mx-auto max-w-xl px-5 py-10">
        {/* header */}
        <div className="mb-8">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-neutral-400">Attenda · Demo 24h</div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Crea tu tienda en minutos</h1>
          <p className="mt-1 text-[15px] text-neutral-600">
            Responde 3 pasos. Recibes una demo real con tu marca, lista para operar.
          </p>
        </div>

        {/* progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`mb-1 h-1 w-full rounded-full ${i <= step ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${i <= step ? 'text-neutral-900' : 'text-neutral-400'}`}>{s}</div>
            </div>
          ))}
        </div>

        {/* STEP 0 — brand basics */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Nombre del negocio *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Dulce Noche" className={`mt-1.5 ${inputCls}`} />
              <p className="mt-1 text-[12px] text-neutral-400">Tu letrero en la tienda</p>
            </div>
            <div>
              <label className={labelCls}>WhatsApp para recibir pedidos *</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+591 700 00000" className={`mt-1.5 ${inputCls}`} inputMode="tel" />
              <p className="mt-1 text-[12px] text-neutral-400">Cada pedido llega como mensaje listo para enviar</p>
            </div>
            <div>
              <label className={labelCls}>Ciudad / zona principal</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Equipetrol" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Instagram (opcional)</label>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tunegocio" className={`mt-1.5 ${inputCls}`} />
            </div>
            <button disabled={!canNext0} onClick={next} className="w-full rounded-xl bg-neutral-900 py-3.5 text-[15px] font-semibold text-white disabled:opacity-30">
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 1 — style */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelCls}>Frase de la marca</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ej: Horneado hoy, entrega esta noche" className={`mt-1.5 ${inputCls}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Color principal</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5">
                  <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  <span className="font-mono text-[13px] text-neutral-600">{primary.toUpperCase()}</span>
                </div>
              </div>
              <div>
                <label className={labelCls}>Color de acento</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2.5">
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  <span className="font-mono text-[13px] text-neutral-600">{accent.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-neutral-200 p-5">
              <div className="text-[12px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">Vista previa</div>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl" style={{ backgroundColor: primary }} />
                <div>
                  <div className="text-lg font-bold tracking-tight text-neutral-900">{name || 'Tu Negocio'}</div>
                  <div className="text-[13px] text-neutral-500" style={{ color: accent }}>{tagline || 'Tu frase de marca'}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="rounded-xl border border-neutral-300 px-5 py-3.5 text-[15px] font-semibold text-neutral-700">Atrás</button>
              <button disabled={!canNext1} onClick={next} className="flex-1 rounded-xl bg-neutral-900 py-3.5 text-[15px] font-semibold text-white disabled:opacity-30">Continuar →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — menu */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-[14px] text-neutral-600">
              Agrega hasta 12 productos de ejemplo. Puedes dejarlo vacío — cargamos un menú de muestra que luego editas en tu admin.
            </p>
            <div>
              <label className={labelCls}>Frase del menú</label>
              <input value={brandLine} onChange={(e) => setBrandLine(e.target.value)} placeholder="Ej: Hecho al momento, directo a tu puerta" className={`mt-1.5 ${inputCls}`} />
            </div>
            {items.map((it, i) => (
              <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-widest text-neutral-400">Producto {i + 1}</span>
                  {i > 0 && (
                    <button onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))} className="text-[13px] font-semibold text-red-500">Quitar</button>
                  )}
                </div>
                <div className="space-y-3">
                  <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Nombre (Ej: Caja 6)" className={`${inputCls} !py-3`} />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} placeholder="Precio Bs" inputMode="decimal" className={`${inputCls} !py-3`} />
                    <select value={it.category} onChange={(e) => setItem(i, { category: e.target.value })} className={`${inputCls} !py-3`}>
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Descripción (opcional)" className={`${inputCls} !py-3`} />
                </div>
              </div>
            ))}
            {items.length < 12 && (
              <button onClick={() => setItems((arr) => [...arr, { name: '', price: '', category: 'Menú', description: '' }])}
                      className="w-full rounded-xl border-2 border-dashed border-neutral-300 py-3.5 text-[15px] font-semibold text-neutral-500 hover:border-neutral-900 hover:text-neutral-900">
                + Agregar producto
              </button>
            )}
            <div className="flex gap-3">
              <button onClick={back} className="rounded-xl border border-neutral-300 px-5 py-3.5 text-[15px] font-semibold text-neutral-700">Atrás</button>
              <button disabled={busy || !canSubmit} onClick={submit} className="flex-1 rounded-xl bg-neutral-900 py-3.5 text-[15px] font-semibold text-white disabled:opacity-30">
                {busy ? 'Creando tu demo…' : 'Crear mi demo →'}
              </button>
            </div>
            {err && <p className="text-[14px] font-medium text-red-500">{err}</p>}
          </div>
        )}
      </div>
    </div>
  )
}