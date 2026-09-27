'use client';

import { useState } from 'react';
import { track } from '@/lib/serve/analytics';
import { Briefcase, Users, Globe, Check, ArrowRight, ArrowDown } from 'lucide-react';

const INK = '#15202B';
const NAVY = '#1B1F3B';
const CREAM = '#F3F0E6';
const PAPER = '#FFFFFF';
const TEAL = '#2BB8B2';
const TEAL_INK = '#0E5F5B';
const SHADOW = '4px 4px 0 var(--sv-ink, #15202B)';

/* ── internal team (simplified per new model) ── */
const JOBS = [
  {
    title: 'Activation & Customer Success Specialist',
    type: 'Tiempo completo · Remoto LATAM',
    salary: '$800 – $1,200 USD/mes según experiencia + bono por retención',
    points: [
      'Monitorea nuevas activaciones y ayuda a negocios que se traban',
      'QA de storefronts y menús recién creados',
      'Configura WhatsApp cuando es necesario — la plataforma se integra sola',
      'Mejora la tasa de activación, reduce cancelaciones, reporta fricción de producto',
      'Recolecta feedback directo de los comercios',
    ],
  },
  {
    title: 'Customer Support',
    type: 'Tiempo parcial (~20h/semana) · Remoto LATAM',
    salary: '$600 USD/mes + bono por satisfacción',
    points: [
      'Soporte por WhatsApp: preguntas de cuenta, pedidos, flujo de trabajo',
      'Escala problemas técnicos con capturas y pasos de reproducción',
      'Mantén FAQs y la base de conocimiento',
    ],
  },
];

/* ── affiliate program ── */
const AFFILIATE_INCLUDES = [
  'Link y código personal de referido',
  'Materiales de venta',
  'Acceso a demo',
  'Capacitación Attenda Serve',
  'Dashboard de afiliado',
  'Seguimiento de activaciones y comisiones recurrentes',
  'Pagos mensuales',
];

const SALES_STEPS = [
  ['1', 'Encuentra un negocio', 'Restaurantes, pollerías, pastelerías, bodegas — cualquier negocio local.'],
  ['2', 'Crea su demo en ~2 minutos', 'Con el wizard de Attenda Serve, en frente del dueño.'],
  ['3', 'El negocio prueba su propia tienda', 'Ve su menú, sus fotos, su marca — se vende solo.'],
  ['4', 'Se activa en Starter $29 o Growth $49', 'El dueño elige su plan y sale a producción.'],
  ['5', 'Ganas $24 + ingreso recurrente', 'El negocio paga $12 de activación, Attenda iguala otros $12 → $24 para ti. Además $2.90/mes por Starter, $4.90/mes por Growth.'],
];

const MP_CAN = [
  'Construir la red local de afiliados',
  'Crear alianzas estratégicas',
  'Desarrollar relaciones con restaurantes y grupos de negocios',
  'Coordinar apariciones en podcasts y medios',
  'Crear lanzamientos y eventos locales',
  'Generar ventas directas',
  'Reclutar y gestionar afiliados locales',
  'Enviar feedback de mercado a Attenda',
];

export default function CareersPage() {
  const [tab, setTab] = useState<'jobs' | 'affiliate' | 'partner'>('jobs');
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const [f, setF] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const st = (k: string) => status[k] || 'idle';

  const submitForm = async (key: string, type: string, fields: string[]) => {
    setStatus((p) => ({ ...p, [key]: 'sending' }));
    try {
      const data: Record<string, string> = { role: key };
      for (const fl of fields) data[fl] = f[`${key}-${fl}`] || '';
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) throw new Error();
      track('partner_application_completed', { key });
      setStatus((p) => ({ ...p, [key]: 'sent' }));
    } catch {
      setStatus((p) => ({ ...p, [key]: 'error' }));
    }
  };

  const inputCls = 'w-full rounded-xl px-4 py-3 text-[15px] font-medium outline-none border-2 bg-transparent placeholder:text-[#9aa1a8]';
  const ink = { borderColor: INK, backgroundColor: PAPER, fontFamily: 'Archivo, sans-serif' };
  const label = 'block text-[11px] font-black uppercase tracking-widest mb-1.5';

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

      {/* HERO */}
      <section className="border-b-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-16 md:py-20 text-center">
          <h1 className="text-[28px] md:text-[42px] font-black tracking-tight text-white max-w-3xl mx-auto" style={{ fontFamily: 'Archivo, sans-serif' }}>
            Construyamos el próximo canal de ventas de los negocios de Latinoamérica.
          </h1>
          <p className="mt-4 text-[15px] md:text-[17px] font-medium max-w-2xl mx-auto" style={{ color: 'rgba(243,240,230,0.78)' }}>
            Attenda Serve se expande por LATAM. Únete al equipo interno, gana ingresos recurrentes como afiliado, o ayúdanos a desarrollar Attenda Serve en tu mercado.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {([['jobs', 'Ver oportunidades'], ['affiliate', 'Quiero ser afiliado'], ['partner', 'Quiero ser Market Partner']] as const).map(([k, l]) => (
              <button key={k} onClick={() => { if (k !== 'jobs') track('partner_application_started', { prog: k }); setTab(k); }}
                className="rounded-xl px-5 py-3 font-black text-[14px] border-2 transition-transform hover:scale-105"
                style={{ backgroundColor: k === 'jobs' ? TEAL : 'transparent', color: k === 'jobs' ? INK : 'white', borderColor: k === 'jobs' ? INK : 'rgba(255,255,255,0.4)', fontFamily: 'Archivo, sans-serif' }}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-6 text-[12px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(243,240,230,0.5)' }}>
            Remoto · LATAM · Compensación en USD
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="max-w-5xl mx-auto px-4 md:px-5">
        <div className="flex gap-3 -mt-7 relative z-10 justify-center flex-wrap">
          {([['jobs', 'Trabaja con Attenda', Briefcase], ['affiliate', 'Afiliados', Users], ['partner', 'Market Partners', Globe]] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => { if (k !== 'jobs') track('partner_application_started', { prog: k }); setTab(k); }}
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-black border-2 transition-transform hover:scale-105"
              style={{ backgroundColor: tab === k ? TEAL : PAPER, color: INK, borderColor: INK, boxShadow: tab === k ? SHADOW : '2px 2px 0 var(--sv-ink, #15202B)', fontFamily: 'Archivo, sans-serif' }}>
              <Icon size={17} strokeWidth={2.5} />{l}
            </button>
          ))}
        </div>
      </div>

      {/* JOBS */}
      {tab === 'jobs' && (
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-12 space-y-4">
          <p className="text-[14px] font-medium" style={{ color: '#3A4750' }}>
            Equipo interno mínimo — Attenda Serve se vende afuera: afiliados y Market Partners llevan el crecimiento de mercado. Aquí solo lo esencial para escalar.
          </p>
          {JOBS.map((j) => (
            <div key={j.title} className="rounded-2xl border-2 bg-white" style={{ borderColor: INK, boxShadow: SHADOW }}>
              <button onClick={() => setOpenJob(openJob === j.title ? null : j.title)} className="w-full text-left p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-[17px]" style={{ fontFamily: 'Archivo, sans-serif' }}>{j.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[12px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg border-2" style={{ borderColor: INK }}>{j.type}</span>
                      <span className="px-2 py-0.5 rounded-lg" style={{ backgroundColor: '#DFF3F2', color: TEAL_INK }}>{j.salary}</span>
                    </div>
                  </div>
                  <ArrowRight size={18} className={`mt-1 shrink-0 transition-transform ${openJob === j.title ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {openJob === j.title && (
                <div className="px-5 pb-5">
                  <ul className="space-y-2">
                    {j.points.map((pt) => (
                      <li key={pt} className="flex gap-2 text-[14px]"><Check size={16} className="mt-0.5 shrink-0" style={{ color: TEAL_INK }} /><span style={{ color: '#3A4750' }}>{pt}</span></li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t-2 pt-4" style={{ borderColor: 'rgba(21,32,43,0.1)' }}>
                    {st(`job-${j.title}`) === 'sent' ? (
                      <div className="text-center font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>✅ Postulación recibida — te contactamos en 48h</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input className={inputCls} style={ink} placeholder="Nombre" value={f[`job-${j.title}-name`] || ''} onChange={(e) => set(`job-${j.title}-name`, e.target.value)} />
                        <input className={inputCls} style={ink} type="email" placeholder="Email" value={f[`job-${j.title}-email`] || ''} onChange={(e) => set(`job-${j.title}-email`, e.target.value)} />
                        <input className={inputCls} style={ink} placeholder="WhatsApp" value={f[`job-${j.title}-phone`] || ''} onChange={(e) => set(`job-${j.title}-phone`, e.target.value)} />
                        <input className={inputCls} style={ink} placeholder="Ciudad / País" value={f[`job-${j.title}-country`] || ''} onChange={(e) => set(`job-${j.title}-country`, e.target.value)} />
                        <button onClick={() => submitForm(`job-${j.title}`, 'serve_careers_application', ['name', 'email', 'phone', 'country'])}
                          className="sm:col-span-2 rounded-xl px-5 py-3 font-black text-white" style={{ backgroundColor: TEAL, color: INK, boxShadow: SHADOW, fontFamily: 'Archivo, sans-serif' }}>
                          {st(`job-${j.title}`) === 'sending' ? 'Enviando...' : `Postular a ${j.title}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AFFILIATES */}
      {tab === 'affiliate' && (
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-12 space-y-8">
          <div className="rounded-2xl border-2 p-6 md:p-8" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
            <h2 className="text-[24px] md:text-[30px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
              Vende una vez. Sigue ganando mientras el cliente siga con nosotros.
            </h2>
            <p className="mt-3 text-[14px]" style={{ color: '#3A4750' }}>
              Para vendedores independientes, creadores, consultores de restaurantes, freelancers, profesionales de hospitality, estudiantes — cualquier persona con acceso a negocios locales.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 p-4" style={{ borderColor: INK }}>
                <div className="text-[12px] font-black uppercase tracking-widest" style={{ color: '#3A4750' }}>Por activación calificada</div>
                <div className="text-[28px] font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>$24 USD</div>
              </div>
              <div className="rounded-xl border-2 p-4" style={{ borderColor: INK, backgroundColor: '#DFF3F2' }}>
                <div className="text-[12px] font-black uppercase tracking-widest" style={{ color: TEAL_INK }}>PLUS · 10% recurrente cada mes</div>
                <div className="text-[15px] font-bold" style={{ fontFamily: 'Archivo, sans-serif' }}>mientras el cliente siga activo</div>
                <div className="mt-1 text-[13px]" style={{ color: TEAL_INK }}>
                  Sobre la suscripción real del cliente:<br />
                  · Starter $29 → <strong>$2.90/mes</strong><br />
                  · Growth $49 → <strong>$4.90/mes</strong>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[13px] font-bold" style={{ color: '#3A4750' }}>Sin límite de ingresos. Sin techo.</div>
          </div>

          {/* HOW SALES WORK */}
          <div className="rounded-2xl border-2 p-6 md:p-8" style={{ borderColor: INK, backgroundColor: NAVY, boxShadow: SHADOW }}>
            <h3 className="text-[20px] md:text-[26px] font-black text-white text-center" style={{ fontFamily: 'Archivo, sans-serif' }}>Cómo funciona una venta</h3>
            <div className="mt-6 max-w-md mx-auto">
              {SALES_STEPS.map(([n, t, d], i) => (
                <div key={n}>
                  <div className="flex gap-3 items-start">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: TEAL, color: INK }}>{n}</div>
                    <div>
                      <div className="text-[15px] font-black text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>{t}</div>
                      <div className="text-[13px]" style={{ color: 'rgba(243,240,230,0.7)' }}>{d}</div>
                    </div>
                  </div>
                  {i < SALES_STEPS.length - 1 && <div className="my-1 ml-4"><ArrowDown size={16} style={{ color: 'rgba(243,240,230,0.4)' }} /></div>}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(43,184,178,0.15)' }}>
              <div className="text-[13px] font-black uppercase tracking-widest" style={{ color: TEAL }}>Tu mejor herramienta de venta</div>
              <div className="mt-1 text-[16px] font-black text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>&ldquo;Déjame crear tu negocio ahora mismo.&rdquo;</div>
              <div className="mt-1 text-[13px]" style={{ color: 'rgba(243,240,230,0.7)' }}>
                Nada de demostraciones de 45 minutos. Creas su demo en vivo, en minutos, con sus propios productos.
              </div>
            </div>
          </div>

          {/* WHAT AFFILIATES RECEIVE */}
          <div className="rounded-2xl border-2 p-6" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
            <h3 className="font-black text-[18px]" style={{ fontFamily: 'Archivo, sans-serif' }}>Lo que recibes como afiliado</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {AFFILIATE_INCLUDES.map((x) => (
                <div key={x} className="flex gap-2 text-[14px]"><Check size={16} className="mt-0.5 shrink-0" style={{ color: TEAL_INK }} /><span style={{ color: '#3A4750' }}>{x}</span></div>
              ))}
            </div>
          </div>

          {/* QUALIFICATION + NO TERRITORY */}
          <div className="rounded-2xl border-2 p-5 text-[13px]" style={{ borderColor: 'rgba(21,32,43,0.25)', backgroundColor: 'rgba(21,32,43,0.03)', color: '#3A4750' }}>
            <strong>Activación calificada:</strong> el negocio se convirtió en cliente pagante de Attenda Serve y completó el período de calificación requerido. Activaciones reembolsadas, fraudulentas o canceladas no califican.
            <br /><strong>Importante:</strong> los afiliados no reciben derechos territoriales exclusivos.
          </div>

          <div className="rounded-2xl border-2 p-6" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
            <h3 className="font-black text-[18px]" style={{ fontFamily: 'Archivo, sans-serif' }}>Conviértete en afiliado</h3>
            <AppForm k="aff" btn="Convertirme en afiliado →" isMP={false} f={f} set={set} st={st} submit={submitForm} />
          </div>
        </div>
      )}

      {/* MARKET PARTNERS */}
      {tab === 'partner' && (
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-12 space-y-8">
          <div className="rounded-2xl border-2 p-6 md:p-8" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
            <h2 className="text-[24px] md:text-[30px] font-black leading-tight" style={{ fontFamily: 'Archivo, sans-serif' }}>
              No solamente vendas Attenda. Ayúdanos a construir el mercado.
            </h2>
            <p className="mt-3 text-[14px]" style={{ color: '#3A4750' }}>
              Market Partners son personas seleccionadas con relaciones locales fuertes, acceso a medios, redes de negocios, capacidad de venta o experiencia emprendedora, que quieren desarrollar Attenda Serve en una ciudad o país.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Bolivia', 'Perú', 'Colombia', 'Ecuador', 'México', '+ mercados LATAM'].map((c) => (
                <span key={c} className="px-3 py-1 rounded-xl border-2 text-[12px] font-black" style={{ borderColor: INK }}>{c}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-2 p-6" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
              <h3 className="font-black text-[17px]" style={{ fontFamily: 'Archivo, sans-serif' }}>Qué puede hacer un Market Partner</h3>
              <ul className="mt-3 space-y-2">
                {MP_CAN.map((x) => (
                  <li key={x} className="flex gap-2 text-[14px]"><Check size={16} className="mt-0.5 shrink-0" style={{ color: TEAL_INK }} /><span style={{ color: '#3A4750' }}>{x}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 p-6" style={{ borderColor: INK, backgroundColor: NAVY, boxShadow: SHADOW }}>
              <h3 className="font-black text-[17px] text-white" style={{ fontFamily: 'Archivo, sans-serif' }}>Compensación</h3>
              <div className="mt-4 space-y-3 text-[13px]">
                <div className="rounded-xl p-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="font-black text-white">Ventas propias</div>
                  <div style={{ color: 'rgba(243,240,230,0.75)' }}>$24 por activación (el negocio paga $12, Attenda iguala $12) + 10% recurrente.</div>
                </div>
                <div className="rounded-xl p-3.5" style={{ backgroundColor: 'rgba(43,184,178,0.2)' }}>
                  <div className="font-black text-white">Red de afiliados</div>
                  <div style={{ color: 'rgba(243,240,230,0.85)' }}>
                    <strong>5% override recurrente</strong> por las cuentas que generan los afiliados de tu red.
                    <br />10, 20 o 50 afiliados debajo tuyo — tu ingreso crece cuando el mercado crece.
                  </div>
                </div>
              </div>
              <div className="mt-4 text-[12px]" style={{ color: 'rgba(243,240,230,0.6)' }}>
                Los territorios son por desempeño, no automáticamente exclusivos. Cada Market Partner arranca con un período de desarrollo de mercado de 90 días — el desempeño fuerte puede llevar a responsabilidades territoriales ampliadas y términos comerciales adicionales.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 p-6" style={{ borderColor: INK, backgroundColor: PAPER, boxShadow: SHADOW }}>
            <h3 className="font-black text-[18px]" style={{ fontFamily: 'Archivo, sans-serif' }}>Aplicar como Market Partner</h3>
            <AppForm k="mp" btn="Aplicar como Market Partner →" isMP={true} f={f} set={set} st={st} submit={submitForm} />
          </div>
        </div>
      )}

      {/* PARTNER VISION */}
      <section className="border-t-2" style={{ borderColor: INK, backgroundColor: NAVY }}>
        <div className="max-w-4xl mx-auto px-4 md:px-5 py-14 text-center">
          <h2 className="text-[24px] md:text-[32px] font-black text-white max-w-2xl mx-auto" style={{ fontFamily: 'Archivo, sans-serif' }}>
            Una plataforma. Miles de vendedores. Mercados construidos localmente.
          </h2>
          <p className="mt-4 text-[14px] md:text-[15px]" style={{ color: 'rgba(243,240,230,0.75)' }}>
            Nosotros aportamos la tecnología, la marca, la infraestructura y el soporte. Nuestros partners aportan las relaciones, la distribución y el conocimiento del mercado local.
          </p>
          <p className="mt-2 text-[14px] font-black" style={{ color: TEAL }}>Juntos construimos negocio recurrente.</p>
        </div>
      </section>

      {/* LEGAL */}
      <section className="border-t-2 px-4 md:px-5 py-10" style={{ borderColor: INK, backgroundColor: CREAM }}>
        <div className="max-w-3xl mx-auto text-[12px] leading-relaxed" style={{ color: '#5A6672' }}>
          <p>
            <strong>Términos de los programas de afiliados y Market Partners:</strong> las comisiones están sujetas a verificación de la cuenta, estado activo de pago, reglas de reembolso/cancelación y los términos del programa. Una activación calificada requiere que el negocio sea un cliente pagante y complete el período de calificación. Activaciones reembolsadas, fraudulentas o canceladas no generan comisión.
          </p>
          <p className="mt-2">
            Ser Market Partner no implica relación laboral, franquicia, participación accionaria ni exclusividad territorial permanente. Los territorios son asignados por desempeño y pueden ampliarse o ajustarse según resultados.
          </p>
          <p className="mt-2">
            El lenguaje legal final puede revisarse por país. Todas las compensaciones en dólares estadounidenses (USD).
          </p>
        </div>
      </section>
    </div>
  );
}

function AppForm({ k, btn, isMP, f, set, st, submit }: {
  k: string; btn: string; isMP: boolean;
  f: Record<string, string>;
  set: (k: string, v: string) => void;
  st: (k: string) => 'idle' | 'sending' | 'sent' | 'error';
  submit: (key: string, type: string, fields: string[]) => void;
}) {
  const inputCls = 'w-full rounded-xl px-4 py-3 text-[15px] font-medium outline-none border-2 bg-transparent placeholder:text-[#9aa1a8]';
  const ink = { borderColor: INK, backgroundColor: PAPER, fontFamily: 'Archivo, sans-serif' };
  const label = 'block text-[11px] font-black uppercase tracking-widest mb-1.5';
  const v = (fl: string) => f[`${k}-${fl}`] || '';

  if (st(k) === 'sent') {
    return (
      <div className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: INK, backgroundColor: '#DFF3F2', boxShadow: SHADOW }}>
        <div className="font-black" style={{ fontFamily: 'Archivo, sans-serif' }}>✅ Postulación recibida</div>
        <div className="mt-1 text-[13px]" style={{ color: '#3A4750' }}>Te contactamos en 48 horas. Revisa tu WhatsApp y tu correo.</div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={label}>Nombre *</label><input required className={inputCls} style={ink} placeholder="Tu nombre" value={v('name')} onChange={(e) => set(`${k}-name`, e.target.value)} /></div>
        <div><label className={label}>Email *</label><input required type="email" className={inputCls} style={ink} placeholder="tu@email.com" value={v('email')} onChange={(e) => set(`${k}-email`, e.target.value)} /></div>
        <div><label className={label}>WhatsApp</label><input className={inputCls} style={ink} placeholder="+51 ..." value={v('phone')} onChange={(e) => set(`${k}-phone`, e.target.value)} /></div>
        <div><label className={label}>País / Ciudad *</label><input required className={inputCls} style={ink} placeholder="Bolivia · La Paz" value={v('country')} onChange={(e) => set(`${k}-country`, e.target.value)} /></div>
      </div>
      {isMP && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>Ocupación / negocio actual</label><input className={inputCls} style={ink} placeholder="Ej: agente inmobiliario, dueño de medio local" value={v('occupation')} onChange={(e) => set(`${k}-occupation`, e.target.value)} /></div>
          <div><label className={label}>Red de contactos de negocios</label><input className={inputCls} style={ink} placeholder="Cámaras, asociaciones, grupos..." value={v('network')} onChange={(e) => set(`${k}-network`, e.target.value)} /></div>
          <div><label className={label}>Relación con restaurantes</label><input className={inputCls} style={ink} placeholder="Proveedores, consultores, dueños..." value={v('restaurants')} onChange={(e) => set(`${k}-restaurants`, e.target.value)} /></div>
          <div><label className={label}>Media / Podcast / Redes</label><input className={inputCls} style={ink} placeholder="Podcast propio, 10k seguidores..." value={v('media')} onChange={(e) => set(`${k}-media`, e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={label}>Experiencia en ventas</label><input className={inputCls} style={ink} placeholder="Qué has vendido y a quién" value={v('salesExperience')} onChange={(e) => set(`${k}-salesExperience`, e.target.value)} /></div>
        </div>
      )}
      <div><label className={label}>{isMP ? 'Por qué quieres construir Attenda en tu mercado' : 'Cuéntanos de ti'}</label><textarea className={inputCls} style={{ ...ink, minHeight: 84 }} placeholder="Cuanto más concreto, mejor" value={v('why')} onChange={(e) => set(`${k}-why`, e.target.value)} /></div>
      <div><label className={label}>Disponibilidad semanal</label><input className={inputCls} style={ink} placeholder="Ej: 10 horas" value={v('availability')} onChange={(e) => set(`${k}-availability`, e.target.value)} /></div>
      {st(k) === 'error' && <div className="text-[13px] font-bold" style={{ color: '#B33A2B' }}>Error al enviar — intenta de nuevo.</div>}
      <button onClick={() => submit(k, isMP ? 'serve_market_partner_application' : 'serve_affiliate_application', isMP
        ? ['name', 'email', 'phone', 'country', 'occupation', 'network', 'restaurants', 'salesExperience', 'media', 'why', 'availability']
        : ['name', 'email', 'phone', 'country', 'why', 'availability'])}
        className="w-full rounded-xl px-5 py-3.5 font-black transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: TEAL, color: INK, boxShadow: SHADOW, fontFamily: 'Archivo, sans-serif' }}>
        {st(k) === 'sending' ? 'Enviando...' : btn}
      </button>
    </div>
  );
}