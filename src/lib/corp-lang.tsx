'use client';

/* Attenda corporate EN/ES language layer.
   Default: ES (Ale's call — LATAM-first company). Persisted in localStorage.
   Pages wrap their content in <LangProvider> and read strings via t(key).
   IMPORTANT: default language must render on first paint (no flash) —
   provider initializes synchronously from localStorage inside a useEffect-free
   useState initializer guarded for SSR. */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'en' | 'es';

const DICT: Record<string, { en: string; es: string }> = {
  // nav
  'nav.products': { en: 'Products', es: 'Productos' },
  'nav.ecosystem': { en: 'Ecosystem', es: 'Ecosistema' },
  'nav.company': { en: 'Company', es: 'Compañía' },
  'nav.insights': { en: 'Insights', es: 'Insights' },
  'nav.careers': { en: 'Careers', es: 'Carreras' },
  'nav.talk': { en: 'Talk to Attenda', es: 'Habla con Attenda' },
  'nav.explore': { en: 'Explore our products', es: 'Explora nuestros productos' },
  'nav.discover': { en: 'Discover Attenda', es: 'Conoce Attenda' },
  // footer
  'footer.tagline': { en: 'Technology for the people who keep business moving.', es: 'Tecnología para las personas que mantienen el negocio en movimiento.' },
  'footer.products': { en: 'Products', es: 'Productos' },
  'footer.company': { en: 'Company', es: 'Compañía' },
  'footer.legal': { en: 'Legal', es: 'Legal' },
  'footer.contact': { en: 'Contact', es: 'Contacto' },
  'footer.about': { en: 'About', es: 'Sobre nosotros' },
  'footer.security': { en: 'Security', es: 'Seguridad' },
  'footer.rights': { en: '© 2026 Attenda Technologies LLC. All rights reserved.', es: '© 2026 Attenda Technologies LLC. Todos los derechos reservados.' },
  'footer.region': { en: 'Miami, FL · Operating across the U.S. and Latin America', es: 'Miami, FL · Operando en EE.UU. y Latinoamérica' },
  // product names/descs (nav dropdown + footer)
  'prod.h.name': { en: 'Attenda Hospitality', es: 'Attenda Hospitality' },
  'prod.h.desc': { en: 'Technology for hotel operations.', es: 'Tecnología para la operación hotelera.' },
  'prod.s.name': { en: 'Attenda Serve', es: 'Attenda Serve' },
  'prod.s.desc': { en: 'Your business. Your channel. Your customers.', es: 'Tu negocio. Tu canal. Tus clientes.' },
  'prod.t.name': { en: 'Attenda Transportation', es: 'Attenda Transportation' },
  'prod.t.desc': { en: 'Scheduling, dispatch & live vehicle operations.', es: 'Agenda, despacho y operación de vehículos en vivo.' },
  // homepage hero
  'home.hero.badge': { en: 'Attenda Technologies · Miami', es: 'Attenda Technologies · Miami' },
  'home.hero.l1': { en: 'Technology for the people', es: 'Tecnología para las personas' },
  'home.hero.l2': { en: 'who keep business moving.', es: 'que mantienen el negocio en movimiento.' },
  'home.hero.sub': { en: "We build practical operating technology for hospitality, commerce, and transportation — designed around how work actually happens.", es: 'Construimos tecnología operativa práctica para hotelería, comercio y transporte — diseñada según cómo ocurre el trabajo de verdad.' },
  'home.hero.built': { en: 'Built in Miami · Operating across the U.S. and Latin America', es: 'Hecho en Miami · Operando en EE.UU. y Latinoamérica' },
  // what we build
  'home.wwb.eyebrow': { en: 'What we build', es: 'Lo que construimos' },
  'home.wwb.h1': { en: 'Different industries.', es: 'Industrias distintas.' },
  'home.wwb.h2': { en: 'The same operational problem.', es: 'El mismo problema operativo.' },
  'home.wwb.p1': { en: 'Businesses rarely suffer from a lack of information. The problem is that the information, people and work are spread across messages, paper, disconnected systems and individual knowledge.', es: 'Los negocios rara vez sufren por falta de información. El problema es que la información, las personas y el trabajo están dispersos entre mensajes, papel, sistemas desconectados y conocimiento individual.' },
  'home.wwb.p2': { en: 'Attenda builds technology that organizes that work into systems people can actually use.', es: 'Attenda construye tecnología que organiza ese trabajo en sistemas que las personas sí pueden usar.' },
  // product cards
  'home.card.h.head': { en: 'Run the operation around the reservation.', es: 'Opera la operación alrededor de la reservación.' },
  'home.card.h.copy': { en: 'One operational layer for the work happening outside the PMS — staff workflows, guest requests, housekeeping, maintenance, inspections, procedures, knowledge and visibility.', es: 'Una capa operativa para el trabajo fuera del PMS — flujos del personal, solicitudes de huéspedes, housekeeping, mantenimiento, inspecciones, procedimientos, conocimiento y visibilidad.' },
  'home.card.h.cta': { en: 'Explore Attenda Hospitality', es: 'Explora Attenda Hospitality' },
  'home.card.s.copy': { en: 'Attenda Serve gives restaurants, independent sellers and everyday businesses their own digital sales channel — storefront, online ordering, local payment workflows, WhatsApp, staff operations and customer retention.', es: 'Attenda Serve les da a restaurantes, vendedores independientes y negocios de todos los días su propio canal de ventas digital — tienda, pedidos en línea, pagos locales, WhatsApp, operación del personal y clientes recurrentes.' },
  'home.card.s.cta': { en: 'Explore Attenda Serve', es: 'Explora Attenda Serve' },
  'home.card.t.head': { en: "Know who's moving, where and when.", es: 'Sabe quién se mueve, dónde y cuándo.' },
  'home.card.t.copy': { en: 'Attenda Transportation connects customers, properties, dispatchers and drivers through live scheduling, pickup coordination, vehicle visibility and operational communication.', es: 'Attenda Transportation conecta clientes, propiedades, despachadores y conductores con agenda en vivo, coordinación de recogidas, visibilidad de vehículos y comunicación operativa.' },
  'home.card.t.cta': { en: 'Explore Transportation', es: 'Explora Transportation' },
  // idea
  'home.idea.eyebrow': { en: 'Why Attenda', es: 'Por qué Attenda' },
  'home.idea.h1': { en: 'Technology should fit the operation.', es: 'La tecnología debe ajustarse a la operación.' },
  'home.idea.h2': { en: "The operation shouldn't have to fit the technology.", es: 'La operación no debería tener que ajustarse a la tecnología.' },
  'home.idea.p1': { en: 'Attenda started from real operating environments where work rarely happens inside one perfect system. Someone sends a WhatsApp. Someone calls the front desk. A driver gets dispatched. A customer places an order. A manager assigns a task. An employee completes a checklist.', es: 'Attenda nació en entornos operativos reales donde el trabajo rara vez ocurre dentro de un sistema perfecto. Alguien manda un WhatsApp. Alguien llama a recepción. Se despacha un conductor. Un cliente hace un pedido. Un gerente asigna una tarea. Un empleado completa una checklist.' },
  'home.idea.p2': { en: "The problem isn't the people. The problem is that the work becomes fragmented.", es: 'El problema no son las personas. El problema es que el trabajo se fragmenta.' },
  'home.idea.p3': { en: 'Attenda turns those everyday actions into organized workflows.', es: 'Attenda convierte esas acciones de todos los días en flujos organizados.' },
  // ecosystem
  'home.eco.eyebrow': { en: 'One ecosystem', es: 'Un ecosistema' },
  'home.eco.h1': { en: 'Built separately.', es: 'Construidos por separado.' },
  'home.eco.h2': { en: 'Designed to work together.', es: 'Diseñados para trabajar juntos.' },
  'home.eco.p1': { en: 'Each Attenda product can operate independently. Where workflows overlap, the ecosystem is designed to connect them.', es: 'Cada producto Attenda puede operar de forma independiente. Donde los flujos se cruzan, el ecosistema está diseñado para conectarlos.' },
  'home.eco.above': { en: 'THE COMPANY ABOVE THE PRODUCTS', es: 'LA COMPAÑÍA SOBRE LOS PRODUCTOS' },
  'home.eco.node.h.sub': { en: 'Hotel operations', es: 'Operación hotelera' },
  'home.eco.node.t.sub': { en: 'Live vehicle operations', es: 'Operación de vehículos en vivo' },
  'home.eco.node.s.sub': { en: 'Commerce & orders', es: 'Comercio y pedidos' },
  'home.eco.link1': { en: 'Guest demand ⇄ Commerce', es: 'Demanda de huéspedes ⇄ Comercio' },
  'home.eco.link2': { en: 'Fulfillment ⇄ Movement', es: 'Fulfillment ⇄ Movimiento' },
  'home.eco.conn1.title': { en: 'HOSPITALITY + TRANSPORTATION', es: 'HOSPITALITY + TRANSPORTATION' },
  'home.eco.conn1.copy': { en: 'A hotel coordinates shuttle demand while a transportation provider manages vehicles, drivers, pickups and ETAs. Same movement. Different operational views.', es: 'Un hotel coordina la demanda de shuttles mientras un operador de transporte gestiona vehículos, conductores, recogidas y ETAs. El mismo movimiento. Vistas operativas distintas.' },
  'home.eco.conn1.chain': { en: 'Guest → Hotel → Transportation → Driver', es: 'Huésped → Hotel → Transporte → Conductor' },
  'home.eco.conn2.title': { en: 'HOSPITALITY + SERVE', es: 'HOSPITALITY + SERVE' },
  'home.eco.conn2.copy': { en: 'Hospitality guests access curated food and commerce options while businesses manage orders in their own operating environment.', es: 'Los huéspedes acceden a comida y comercio curados mientras los negocios gestionan pedidos en su propio entorno operativo.' },
  'home.eco.conn2.chain': { en: 'Guest → Hospitality experience → Merchant → Serve', es: 'Huésped → Experiencia hospitality → Negocio → Serve' },
  'home.eco.conn3.title': { en: 'SERVE + TRANSPORTATION', es: 'SERVE + TRANSPORTATION' },
  'home.eco.conn3.copy': { en: 'Commerce eventually creates fulfillment. Where transportation is needed, transportation workflows connect sellers, customers and drivers.', es: 'El comercio eventualmente crea fulfillment. Donde se necesita transporte, los flujos de transporte conectan vendedores, clientes y conductores.' },
  'home.eco.conn3.chain': { en: 'Order → Fulfillment → Driver → Customer', es: 'Pedido → Fulfillment → Conductor → Cliente' },
  'home.eco.note': { en: 'Designed to connect. Can connect where workflows overlap. Part of the Attenda ecosystem — showing what exists today honestly, and where the platform is going.', es: 'Diseñados para conectarse. Pueden conectarse donde los flujos se cruzan. Parte del ecosistema Attenda — mostrando con honestidad lo que existe hoy y hacia dónde va la plataforma.' },
  // principle
  'home.prin.h1': { en: "We don't build technology", es: 'No construimos tecnología' },
  'home.prin.h2': { en: 'to replace the people doing the work.', es: 'para reemplazar a las personas que hacen el trabajo.' },
  'home.prin.h3': { en: 'We build technology', es: 'Construimos tecnología' },
  'home.prin.h4': { en: 'to make their work work better.', es: 'para que su trabajo funcione mejor.' },
  'home.prin.p': { en: 'Attenda organizes information, workflows and communication so the people responsible for the operation have better visibility and better tools.', es: 'Attenda organiza la información, los flujos y la comunicación para que las personas responsables de la operación tengan mejor visibilidad y mejores herramientas.' },
  'home.prin.p2': { en: 'AI can assist. Software can organize. People still decide.', es: 'La IA puede asistir. El software puede organizar. Las personas siguen decidiendo.' },
  // real work
  'home.rw.eyebrow': { en: 'Built around real work', es: 'Construido alrededor del trabajo real' },
  'home.rw.h': { en: 'Three operations. One philosophy.', es: 'Tres operaciones. Una filosofía.' },
  'home.rw.hotel': { en: 'A HOTEL', es: 'UN HOTEL' },
  'home.rw.biz': { en: 'A BUSINESS', es: 'UN NEGOCIO' },
  'home.rw.trans': { en: 'A TRANSPORTATION OPERATION', es: 'UNA OPERACIÓN DE TRANSPORTE' },
  'home.rw.hotel.line': { en: 'Attenda Hospitality connects the operation.', es: 'Attenda Hospitality conecta la operación.' },
  'home.rw.biz.line': { en: 'Attenda Serve organizes the sale.', es: 'Attenda Serve organiza la venta.' },
  'home.rw.trans.line': { en: 'Attenda Transportation organizes the movement.', es: 'Attenda Transportation organiza el movimiento.' },
  'home.rw.final': { en: 'Different work.', es: 'Trabajo distinto.' },
  'home.rw.final2': { en: 'Same philosophy.', es: 'Misma filosofía.' },
  // company/miami
  'home.company.eyebrow': { en: 'Attenda Technologies', es: 'Attenda Technologies' },
  'home.company.h1': { en: 'Built by operators.', es: 'Construida por operadores.' },
  'home.company.h2': { en: 'Built for operators.', es: 'Construida para operadores.' },
  'home.company.p1a': { en: 'Attenda began inside hospitality, where we saw firsthand how much of an operation still depends on disconnected tools, paper, messages and knowledge living inside people’s heads. That experience led to a bigger idea: ', es: 'Attenda nació dentro de la hotelería, donde vimos de primera mano cuánto de una operación aún depende de herramientas desconectadas, papel, mensajes y conocimiento en la cabeza de las personas. Esa experiencia llevó a una idea más grande: ' },
  'home.company.p1b': { en: 'technology should be built around how people actually operate.', es: 'la tecnología debe construirse según cómo la gente realmente opera.' },
  'home.company.p2': { en: 'Today, Attenda Technologies applies that philosophy across hospitality, commerce and transportation. We build systems for people doing real work — not software designed in isolation from it.', es: 'Hoy, Attenda Technologies aplica esa filosofía en hotelería, comercio y transporte. Construimos sistemas para personas que hacen trabajo real — no software diseñado aislado de él.' },
  'home.company.story': { en: 'Our story', es: 'Nuestra historia' },
  'home.company.miami.badge': { en: 'MIAMI, FLORIDA', es: 'MIAMI, FLORIDA' },
  'home.company.miami.h': { en: 'Our home.', es: 'Nuestra casa.' },
  'home.company.miami.p': { en: "A city connecting the United States, Latin America, hospitality, commerce, transportation and entrepreneurship. The natural home for what we're building.", es: 'Una ciudad que conecta Estados Unidos, Latinoamérica, hotelería, comercio, transporte y emprendimiento. El hogar natural de lo que estamos construyendo.' },
  // latam
  'home.latam.h1': { en: 'Built in Miami.', es: 'Construida en Miami.' },
  'home.latam.h2': { en: 'Designed beyond borders.', es: 'Diseñada más allá de las fronteras.' },
  'home.latam.p': { en: 'Attenda Technologies builds products for markets where operational technology needs to be practical, accessible and adaptable to how people already work.', es: 'Attenda Technologies construye productos para mercados donde la tecnología operativa debe ser práctica, accesible y adaptable a cómo la gente ya trabaja.' },
  'home.latam.t1': { en: 'Hospitality', es: 'Hospitality' },
  'home.latam.t1c': { en: 'Begins with U.S. operators.', es: 'Empieza con operadores de EE.UU.' },
  'home.latam.t2': { en: 'Serve', es: 'Serve' },
  'home.latam.t2c': { en: 'Built with Latin American businesses in mind.', es: 'Pensado para negocios latinoamericanos.' },
  'home.latam.t3': { en: 'Transportation', es: 'Transportation' },
  'home.latam.t3c': { en: 'Connects physical operations wherever people and vehicles need better coordination.', es: 'Conecta operaciones físicas dondequiera que personas y vehículos necesiten mejor coordinación.' },
  'home.latam.final': { en: 'The technology changes by market.', es: 'La tecnología cambia por mercado.' },
  'home.latam.final2': { en: 'The principle does not.', es: 'El principio no.' },
  // how we build
  'home.how.eyebrow': { en: 'How we build', es: 'Cómo construimos' },
  'home.how.h1': { en: 'Powerful underneath.', es: 'Poderosa por dentro.' },
  'home.how.h2': { en: 'Simple where it matters.', es: 'Simple donde importa.' },
  'home.how.p': { en: 'The best operational technology disappears into the work. People should not need to become software experts to use Attenda.', es: 'La mejor tecnología operativa desaparece en el trabajo. Las personas no deberían tener que volverse expertas en software para usar Attenda.' },
  'home.how.1t': { en: 'Mobile-first', es: 'Mobile-first' },
  'home.how.1c': { en: 'Built around the devices people already carry.', es: 'Construida sobre los dispositivos que la gente ya lleva.' },
  'home.how.2t': { en: 'Role-based', es: 'Por roles' },
  'home.how.2c': { en: 'People see the tools relevant to their work.', es: 'Cada persona ve las herramientas relevantes para su trabajo.' },
  'home.how.3t': { en: 'Real-time', es: 'Tiempo real' },
  'home.how.3c': { en: 'Operational information changes as the work happens.', es: 'La información operativa cambia mientras el trabajo ocurre.' },
  'home.how.4t': { en: 'Human-centered AI', es: 'IA centrada en las personas' },
  'home.how.4c': { en: 'AI assists people instead of pretending to replace judgment.', es: 'La IA asiste a las personas en vez de fingir reemplazar el criterio.' },
  'home.how.5t': { en: 'Connected', es: 'Conectada' },
  'home.how.5c': { en: 'Products can exchange information where workflows overlap.', es: 'Los productos pueden intercambiar información donde los flujos se cruzan.' },
  'home.how.6t': { en: 'Market-aware', es: 'Adaptada al mercado' },
  'home.how.6c': { en: 'Payments, communication and workflows adapt to the environments where Attenda operates.', es: 'Pagos, comunicación y flujos se adaptan a los entornos donde Attenda opera.' },
  // conversion tiles
  'home.tiles.h.t': { en: 'Run the operation.', es: 'Opera la operación.' },
  'home.tiles.s.l': { en: 'Own your channel.', es: 'Sé dueño de tu canal.' },
  'home.tiles.t.l': { en: 'Coordinate the movement.', es: 'Coordina el movimiento.' },
  'home.tiles.explore': { en: 'Explore', es: 'Explora' },
  // company CTA
  'home.cta.h': { en: 'What are you trying to operate?', es: '¿Qué intentas operar?' },
  'home.cta.q1': { en: 'A hospitality property', es: 'Una propiedad hotelera' },
  'home.cta.q2': { en: 'A business that sells', es: 'Un negocio que vende' },
  'home.cta.q3': { en: 'A transportation operation', es: 'Una operación de transporte' },
  'home.cta.talk': { en: 'Talk to Attenda Technologies', es: 'Habla con Attenda Technologies' },
  // lang toggle
  'lang.toggle': { en: 'ES', es: 'EN' },
};

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: 'es',
  setLang: () => {},
  t: (k) => DICT[k]?.es ?? k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('attenda_lang') as Lang | null) ?? 'es';
      if (saved !== lang) setLangState(saved);
    } catch { /* private mode */ }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('attenda_lang', l); } catch { /* ignore */ }
  };
  const t = (k: string) => DICT[k]?.[lang] ?? k;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      className={`text-[11px] font-black tracking-wider px-2.5 py-1.5 rounded-lg border transition-colors ${light ? 'border-white/25 text-white/80 hover:text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900'}`}
      aria-label="Switch language"
    >
      {lang === 'en' ? 'ES' : 'EN'}
    </button>
  );
}