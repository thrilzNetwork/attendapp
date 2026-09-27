'use client';

import { useState } from 'react';
import { Briefcase, Users, Check, ArrowRight, MapPin, Clock, DollarSign } from 'lucide-react';

const INK = '#15202B';
const NAVY = '#1B1F3B';
const CREAM = '#F3F0E6';
const PAPER = '#FFFFFF';
const TEAL = '#2BB8B2';
const TEAL_INK = '#0E5F5B';
const SHADOW = '4px 4px 0 var(--sv-ink, #15202B)';

const JOBS = [
  {
    title: 'Sales Representative',
    type: 'Comisión + bonos',
    salary: 'Ingresos ilimitados por comisión — $50 por cada negocio activado + 10% recurrente de su mensualidad',
    location: 'Remoto (Lima / provincias)',
    schedule: 'Flexible, tiempo parcial o completo',
    points: [
      'Consigues negocios locales (restaurantes, pastelerías, tiendas) que quieren vender online',
      'Les creas su demo gratis en 2 minutos — el producto se vende solo',
      '$50 por activación + 10% de la mensualidad de cada cliente, todos los meses, mientras sigan activos',
      'Sin techo: 10 negocios = $500 inicial + $29/mes recurrente; 50 negocios = $2,500 inicial + $145/mes',
    ],
  },
  {
    title: 'Onboarding Specialist',
    type: 'Tiempo completo',
    salary: '$800 – $1,200/mes (USD) según experiencia + bono por retención',
    location: 'Lima (híbrido)',
    schedule: 'Lun–Vie, 9:00–18:00',
    points: [
      'Recibes al negocio recién activado y lo dejas funcionando: menú cargado, fotos, precios, zonas de delivery',
      'Configuras Yape/Plin, horarios y el flujo de WhatsApp',
      'Haces la capacitación al dueño y su staff por videollamada',
      'Reportas trabas y mejoras directo al equipo de producto',
    ],
  },
  {
    title: 'Customer Support (part-time)',
    type: 'Tiempo parcial',
    salary: '$600/mes (USD, 20h semanales) + bono por satisfacción',
    location: 'Remoto',
    schedule: 'Turnos rotativos, incluye 1 fin de semana al mes',
    points: [
      'Atiendes a los negocios por WhatsApp: dudas del panel, pedidos, pagos',
      'Escalas casos técnicos con capturas y pasos de reproducción',
      'Documentas las preguntas frecuentes para reducir tickets',
    ],
  },
];

const AFFILIATE_TIERS = [
  { name: 'Activación', pay: '$50 por negocio que activa su canal', detail: 'Pagado al momento de que el negocio sale a producción con su página.' },
  { name: 'Recurrente', pay: '10% de la mensualidad, cada mes', detail: 'Si tu negocio paga $29/mes, recibes $2.90 cada mes mientras siga activo. Acumula: 20 negocios = $58/mes pasivos, para siempre.' },
  { name: 'Bonus por volumen', pay: '5 negocios/mes → +$100', detail: 'Cada mes que cierras 5+ activaciones recibes un bono adicional de $100 USD.' },
  { name: 'Rango Regional', pay: '50 negocios activos → $400/mes fijo + 15%', detail: 'Tu recurrente sube a 15% y recibes un fijo mensual por administrar la cuenta en tu zona.' },
];

export default function CareersPage() {
  const [tab, setTab] = useState<'jobs' | 'affiliates'>('jobs');
  const [job, setJob] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'serve_careers_application',
          data: { ...form, role: tab === 'affiliates' ? 'Afiliado / Vendedor Serve' : (job || 'Postulación general'), tab },
        }),
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  const inputCls = 'w-full rounded-xl px-4 py-3 text-[15px] font-medium outline-none border-2 bg-transparent placeholder:text-[#9aa1a8]';
  const ink = { borderColor: INK, backgroundColor: PAPER, fontFamily: 'Archivo, sans-serif' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM }}>
      <nav className="sticky top-0 z-50 border-b-2" style={{ borderColor: INK, backgroundColor: CREAM }}>
        <div className="max-w-7xl mx-auto px-4 md:px-5 h-14 md:h-16 flex items-center justify-between">
          <a href="/serve" className="flex items-center gap-2.5">
            <img src="/brand/logo-primary.svg" alt="Attenda" className="h-6 sm:h-7 w-auto" />
            <span className="hidden sm:block w-px h-5" style={{ backgroundColor: INK }} aria-hidden />
            <span className="hidden sm:block text-[16px] font-black tracking-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>Serve</span>
          </a>
          <a href="/serve" className="px-4 py-2 rounded-xl text-[13px] font-black border-2"
            style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)', fontFamily: 'Archivo, sans-serif' }}>
            Volver a Serve
          </a>
        </div>
      </nav>

      <section className="border-b-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-16 md:py-20 text-center">
          <h1 className="text-[30px] md:text-[44px] font-black tracking-tight text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>
            Únete a Attenda Serve
          </h1>
          <p className="mt-4 text-[15px] md:text-[17px] font-medium max-w-2xl mx-auto" style={{ color: 'rgba(243,240,230,0.75)' }}>
            Estamos armando el equipo que lleva pedidos online a cada negocio local.
            Postula a un puesto o gana vendiendo Serve como afiliado. Todas las compensaciones en dólares (USD).
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-5">
        <div className="flex gap-3 -mt-7 relative z-10 justify-center">
          {([['jobs', 'Trabaja con nosotros', Briefcase], ['affiliates', 'Afíliate y vende', Users]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className="flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-black border-2 transition-all"
              style={tab === k ? { backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: SHADOW } : { backgroundColor: PAPER, color: '#5a6168', borderColor: INK }}>
              <Icon size={16} strokeWidth={2.5} /> {label}
            </button>
          ))}
        </div>
      </div>

      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-5">
          {tab === 'jobs' && (
            <>
              <div className="space-y-5">
                {JOBS.map((j) => (
                  <div key={j.title} className="rounded-2xl border-2 p-6" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-[20px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>{j.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-medium" style={{ color: '#5a6168' }}>
                          <span className="flex items-center gap-1.5"><Clock size={14} strokeWidth={2.5} /> {j.schedule}</span>
                          <span className="flex items-center gap-1.5"><MapPin size={14} strokeWidth={2.5} /> {j.location}</span>
                          <span className="flex items-center gap-1.5"><DollarSign size={14} strokeWidth={2.5} /> {j.salary}</span>
                        </div>
                      </div>
                      <button onClick={() => setJob(job === j.title ? null : j.title)}
                        className="rounded-xl px-5 py-2.5 text-[13px] font-black border-2"
                        style={job === j.title ? { backgroundColor: TEAL, borderColor: INK } : { backgroundColor: CREAM, borderColor: INK, boxShadow: '2px 2px 0 var(--sv-ink, #15202B)' }}>
                        {job === j.title ? 'Cerrar' : 'Postular'}
                      </button>
                    </div>
                    <ul className="mt-4 space-y-2 text-[13.5px] font-medium" style={{ color: '#3c434a' }}>
                      {j.points.map((pt) => (
                        <li key={pt} className="flex gap-2.5"><Check size={15} strokeWidth={3} className="mt-0.5 shrink-0" style={{ color: TEAL_INK }} /> {pt}</li>
                      ))}
                    </ul>
                    {job === j.title && (
                      <form onSubmit={submit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input required placeholder="Nombre completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={ink} />
                        <input required type="email" placeholder="Correo *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} style={ink} />
                        <input required placeholder="WhatsApp / teléfono *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} style={ink} />
                        <input placeholder="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} style={ink} />
                        <textarea placeholder="Cuéntanos tu experiencia" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls + ' md:col-span-2'} style={ink} rows={3} />
                        <button disabled={status === 'sending'} className="md:col-span-2 rounded-xl px-6 py-3.5 text-[15px] font-black border-2 disabled:opacity-60"
                          style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: SHADOW, fontFamily: 'Archivo, sans-serif' }}>
                          {status === 'sending' ? 'Enviando…' : `Postular a ${j.title}`}
                        </button>
                        {status === 'sent' && <p className="md:col-span-2 text-[13px] font-bold" style={{ color: TEAL_INK }}>Postulación enviada. Te contactamos esta semana.</p>}
                        {status === 'error' && <p className="md:col-span-2 text-[13px] font-bold text-red-600">Hubo un error. Intenta de nuevo.</p>}
                      </form>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-[13px] font-medium" style={{ color: '#5a6168' }}>
                ¿Ningún puesto encaja? Escríbenos igual — <a href="mailto:careers@attendaapp.com" className="font-bold underline">careers@attendaapp.com</a>
              </p>
            </>
          )}

          {tab === 'affiliates' && (
            <>
              <div className="rounded-2xl border-2 p-7" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
                <h2 className="text-[22px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Plan de compensación</h2>
                <p className="mt-2 text-[14px] font-medium" style={{ color: '#5a6168' }}>
                  Ganas de dos formas: una comisión fuerte por activar negocios, y un ingreso recurrente que crece cada mes mientras sigan activos.
                </p>
                <div className="mt-6 space-y-4">
                  {AFFILIATE_TIERS.map((t) => (
                    <div key={t.name} className="rounded-xl border-2 p-4" style={{ backgroundColor: CREAM, borderColor: INK }}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[15px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>{t.name}</span>
                        <span className="text-[14px] font-black" style={{ color: TEAL_INK }}>{t.pay}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium" style={{ color: '#5a6168' }}>{t.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border-2 p-4" style={{ backgroundColor: NAVY, borderColor: INK }}>
                  <p className="text-[13px] font-bold text-white/90">Ejemplo real: 30 negocios activados en tu primer año =</p>
                  <p className="mt-1 text-[22px] font-black text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>
                    $1,500 en activaciones + $87/mes recurrente
                  </p>
                </div>
                <p className="mt-4 text-[12px] font-medium" style={{ color: '#5a6168' }}>
                  Pagos en dólares (USD) por transferencia, el día 5 de cada mes. Sin metas mínimas para empezar.
                </p>
              </div>

              <form onSubmit={submit} className="mt-6 rounded-2xl border-2 p-6" style={{ backgroundColor: PAPER, borderColor: INK, boxShadow: SHADOW }}>
                <h3 className="text-[18px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>Aplica como afiliado</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input required placeholder="Nombre completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} style={ink} />
                  <input required type="email" placeholder="Correo *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} style={ink} />
                  <input required placeholder="WhatsApp / teléfono *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} style={ink} />
                  <input placeholder="Ciudad / zona donde vendes" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} style={ink} />
                  <textarea placeholder="¿A qué negocios conoces o vendes hoy?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputCls + ' md:col-span-2'} style={ink} rows={3} />
                  <button disabled={status === 'sending'} className="md:col-span-2 rounded-xl px-6 py-3.5 text-[15px] font-black border-2 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: TEAL, color: INK, borderColor: INK, boxShadow: SHADOW, fontFamily: 'Archivo, sans-serif' }}>
                    {status === 'sending' ? 'Enviando…' : <>Enviar aplicación <ArrowRight size={16} strokeWidth={2.5} /></>}
                  </button>
                  {status === 'sent' && <p className="md:col-span-2 text-[13px] font-bold" style={{ color: TEAL_INK }}>Aplicación recibida. Te contactamos con los siguientes pasos.</p>}
                  {status === 'error' && <p className="md:col-span-2 text-[13px] font-bold text-red-600">Hubo un error. Intenta de nuevo.</p>}
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      <footer className="border-t-2 py-8" style={{ borderColor: INK, backgroundColor: CREAM }}>
        <div className="max-w-7xl mx-auto px-4 md:px-5 text-center">
          <img src="/brand/logo-primary.svg" alt="Attenda" className="h-6 mx-auto" />
          <p className="mt-3 text-[12px] font-medium" style={{ color: '#5a6168' }}>Attenda Serve — un producto de Attenda Technologies</p>
        </div>
      </footer>
    </div>
  );
}
