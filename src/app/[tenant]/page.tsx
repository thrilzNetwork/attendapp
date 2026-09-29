import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMenu } from '@/lib/tenant/store'
import { getTenant, brandOf } from '@/lib/tenant/registry'
import FvLogo from '@/components/tenant/fv-logo'
import ChatWidget from '@/components/tenant/chat-widget'
import { ZONES } from '@/lib/tenant/fukin-engine/menu'
import type { Product } from '@/lib/tenant/types'

export const dynamic = 'force-dynamic'

const fmt = (c: number) => `Bs ${(c / 100).toFixed(2)}`

/** Google Business data: name, hours, phone, geo, socials — anchors the knowledge panel. */
function LocalBusinessJsonLd({
  name, base, phone, cuisine, instagram, whatsapp, opens, closes, city,
}: {
  name: string; base: string; phone: string; cuisine: string[]
  instagram: string; whatsapp: string; opens: string; closes: string; city: string
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name,
    url: base,
    telephone: phone,
    servesCuisine: cuisine,
    priceRange: `Bs ${fmt(0).replace('Bs ', '')} - Bs 200`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: 'Santa Cruz',
      addressCountry: 'BO',
    },
    image: [`${base}/icon.svg`],
    sameAs: [
      whatsapp ? `https://wa.me/${whatsapp}` : null,
      instagram ? `https://instagram.com/${instagram.replace('@', '')}` : null,
    ].filter(Boolean),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens,
        closes,
      },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default async function TenantLanding({ params }: { params: { tenant: string } }) {
  const { tenant } = params
  const cfg = await getTenant(tenant)
  if (!cfg) notFound()
  const brand = brandOf(cfg)
  const products: Product[] = await getMenu(tenant)
  const hero = products
    .filter((p) => p.active && p.category === brand.heroCat)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const base = `https://attendaapp.com/${cfg.slug}`
  const appHref = `/${cfg.slug}/menu`

  return (
    <main className="min-h-dvh">
      <LocalBusinessJsonLd
        name={cfg.name}
        base={base}
        phone={`+591 ${cfg.whatsapp.slice(0, 4)} ${cfg.whatsapp.slice(4)}`}
        cuisine={brand.cuisine}
        instagram={cfg.instagram || ''}
        whatsapp={cfg.whatsapp}
        opens={brand.opens}
        closes={brand.closes}
        city={brand.zone0Name}
      />

      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-fv-line bg-fv-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <FvLogo size="md" href={appHref} words={{ wordA: brand.wordA, wordB: brand.wordB }} />
          <div className="flex items-center gap-8">
            <a href="#menu" className="hidden text-xs font-bold uppercase tracking-widest text-fv-cream/60 transition-colors hover:text-fv-cream md:block">
              Menú
            </a>
            <a href="#porque" className="hidden text-xs font-bold uppercase tracking-widest text-fv-cream/60 transition-colors hover:text-fv-cream md:block">
              {brand.navWhy}
            </a>
            <Link
              href={appHref}
              className="rounded-xl bg-fv-orange px-5 py-2.5 font-display text-sm font-bold text-fv-black transition-transform hover:scale-105"
            >
              PEDIR AHORA
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-fv-orange/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-fv-green/10 blur-3xl" />
        <div className="border-b border-fv-line bg-[#0D0D0D] py-3">
          <div className="fv-marquee-track gap-0">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {brand.marquee.map((word, i) => (
                  <span key={i} className="flex items-center font-display text-xs font-bold uppercase tracking-[0.2em] text-fv-cream/70">
                    <span className="mx-6">{word}</span>
                    <span className="text-fv-orange">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fv-green/30 bg-fv-green/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-fv-green">
              <span className="h-1.5 w-1.5 rounded-full bg-fv-green" />
              {brand.zone0Name} · {brand.eta}
            </div>
            <h1 className="mt-5 font-display text-[46px] font-black leading-[1.02] text-fv-cream md:text-[68px]">
              {brand.heroLines[0]}{' '}
              <span className="relative inline-block text-fv-orange">
                {brand.heroAccent}
                <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-fv-orange/40" aria-hidden="true" />
              </span>
              <br />
              {brand.heroLines[1]}
              <br />
              {brand.heroLines[2]}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fv-cream/60">
              {brand.heroPara}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={appHref}
                className="rounded-2xl bg-fv-orange px-8 py-4 font-display text-base font-black text-fv-black shadow-[0_10px_40px_rgba(243,106,18,0.35)] transition-transform hover:scale-105 active:scale-95"
              >
                PEDIR AHORA →
              </Link>
              <a
                href="#menu"
                className="rounded-2xl border border-fv-line px-8 py-4 font-display text-base font-bold text-fv-cream transition-colors hover:border-fv-orange hover:text-fv-orange"
              >
                Ver el menú
              </a>
            </div>
            <div className="mt-8 flex gap-8 text-center">
              {brand.stats.map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-black text-fv-orange">{s.v}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-fv-cream/40">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="grid grid-cols-2 gap-4">
              {hero.slice(0, 4).map((p, i) => (
                <div
                  key={p.slug}
                  className={`overflow-hidden rounded-3xl border border-fv-line bg-fv-panel shadow-[0_25px_60px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:-translate-y-1.5 ${i % 2 === 1 ? 'translate-y-6' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
                  <div className="p-3">
                    <div className="truncate font-display text-[12px] font-bold text-fv-cream">{p.name}</div>
                    <div className="font-display text-sm font-black text-fv-orange">
                      {fmt(p.price)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MENU PREVIEW */}
      <section id="menu" className="border-t border-fv-line bg-[#0D0D0D] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fv-orange">{brand.menuEyebrow}</div>
              <h2 className="mt-2 font-display text-3xl font-black text-fv-cream md:text-4xl">
                {brand.menuTitle}
              </h2>
            </div>
            <Link href={appHref} className="hidden text-sm font-bold text-fv-orange hover:underline md:block">
              Pedir ahora →
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {hero.map((p) => (
              <div key={p.slug} className="group overflow-hidden rounded-3xl border border-fv-line bg-fv-panel transition-all duration-300 hover:-translate-y-1 hover:border-fv-orange/50 hover:shadow-[0_20px_60px_rgba(243,106,18,0.15)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  {p.proteinBadge && (
                    <span className="absolute left-3 top-3 rounded-full bg-fv-green px-2.5 py-1 text-[9px] font-black uppercase text-fv-black">
                      {p.proteinBadge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="font-display text-base font-bold text-fv-cream">{p.name}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-fv-cream/50">{p.long}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-lg font-black text-fv-orange">{fmt(p.price)}</span>
                    <Link
                      href={appHref}
                      className="rounded-xl bg-fv-orange/10 px-4 py-2 font-display text-xs font-bold text-fv-orange transition-colors hover:bg-fv-orange hover:text-fv-black"
                    >
                      Pedir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="porque" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fv-orange">{brand.whyEyebrow}</div>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-black text-fv-cream md:text-4xl">
            {brand.whyTitle}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {brand.whyItems.map((f) => (
              <div key={f.t} className="rounded-3xl border border-fv-line bg-fv-panel p-7">
                <div className="font-display text-lg font-black text-fv-cream">{f.t}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-fv-cream/50">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-fv-line py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(243,106,18,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-black leading-tight text-fv-cream md:text-5xl">
            {brand.ctaTitle}
          </h2>
          <p className="mt-3 text-[15px] text-fv-cream/50">{brand.ctaSub}</p>
          <Link
            href={appHref}
            className="mt-8 inline-block rounded-2xl bg-fv-orange px-10 py-4 font-display text-base font-black text-fv-black shadow-[0_10px_40px_rgba(243,106,18,0.35)] transition-transform hover:scale-105 active:scale-95"
          >
            PEDIR AHORA →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-fv-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <FvLogo size="md" withTagline words={{ wordA: brand.wordA, wordB: brand.wordB, tagline: cfg.tagline }} />
          <p className="text-[11px] text-fv-cream/40">{brand.footerLine}</p>
          {cfg.instagram && (
            <a href={`https://instagram.com/${cfg.instagram.replace('@', '')}`} className="text-xs font-bold text-fv-orange">
              {cfg.instagram.startsWith('@') ? cfg.instagram : `@${cfg.instagram}`}
            </a>
          )}
        </div>
        <div className="mx-auto mt-6 max-w-6xl border-t border-fv-line pt-4 text-center">
          <a href="https://attendaapp.com/serve" target="_blank" rel="noopener noreferrer" className="text-[10px] text-fv-cream/25 transition-colors hover:text-fv-cream/50">
            attendaapp.com/serve
          </a>
        </div>
      </footer>
      <ChatWidget menu={hero.length ? hero : products.filter((p) => p.active).slice(0, 6)} />
    </main>
  )
}