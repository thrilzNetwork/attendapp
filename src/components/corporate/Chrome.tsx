'use client';

/* Attenda Technologies — shared corporate chrome (nav + footer).
   EN/ES via corp-lang LangProvider (default ES). */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useLang, LangToggle, type Lang } from '@/lib/corp-lang';

export const CORP_INK = '#0F172A';
export const CORP_TEAL = '#158A7C';
export const CORP_TEAL_BRIGHT = '#15b79e';
export const CORP_SLATE = '#475569';
export const CORP_MIST = '#F8FAFC';
export const CORP_BORDER = '#E2E8F0';

export const PRODUCTS = [
  { name: 'Attenda Hospitality', href: '/hospitality', descKey: 'prod.h.desc' },
  { name: 'Attenda Serve', href: '/serve', descKey: 'prod.s.desc' },
  { name: 'Attenda Transportation', href: '/transportation', descKey: 'prod.t.desc' },
] as const;

export function CorporateLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="leading-none">
        <div className={`text-[17px] font-black tracking-tight transition-colors ${light ? 'text-white' : 'text-gray-900'}`}>
          ATTENDA
        </div>
        <div className="text-[9px] font-bold tracking-[0.32em] mt-0.5 transition-colors" style={{ color: CORP_TEAL_BRIGHT }}>
          TECHNOLOGIES
        </div>
      </div>
    </Link>
  );
}

export function CorporateNav() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const overHero = !scrolled; // every corporate page opens on a dark hero
  const linkCls = `text-[14px] font-medium transition-colors ${overHero ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-5 h-16 flex items-center justify-between">
        <CorporateLogo light={overHero} />
        <div className="hidden lg:flex items-center gap-7">
          <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
            <button className={`flex items-center gap-1 text-[14px] font-medium transition-colors ${overHero ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              {t('nav.products')} <ChevronDown size={14} className={`transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
            </button>
            {productsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[340px]">
                <div className="bg-white rounded-2xl shadow-xl border p-2" style={{ borderColor: CORP_BORDER }}>
                  {PRODUCTS.map((p) => (
                    <Link key={p.href} href={p.href}
                      className="block px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="text-[14px] font-bold text-gray-900">{p.name}</div>
                      <div className="text-[12.5px] text-gray-500 mt-0.5">{t(p.descKey)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/ecosystem" className={`${linkCls} hidden xl:block`}>{t('nav.ecosystem')}</Link>
          <Link href="/company" className={linkCls}>{t('nav.company')}</Link>
          <Link href="/insights" className={`${linkCls} hidden xl:block`}>{t('nav.insights')}</Link>
          <Link href="/careers" className={linkCls}>{t('nav.careers')}</Link>
          <Link href="/contact" className={linkCls}>{t('nav.talk')}</Link>
          <LangToggle light={overHero} />
          <Link href="/#products"
            className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
            style={{ backgroundColor: CORP_TEAL }}>
            {t('nav.explore')}
          </Link>
        </div>
        <button className={`lg:hidden p-2 transition-colors ${overHero ? 'text-white' : 'text-gray-900'}`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t px-5 py-4 space-y-3" style={{ borderColor: CORP_BORDER }}>
          {PRODUCTS.map((p) => (
            <Link key={p.href} href={p.href} className="block text-[15px] font-bold text-gray-900 py-1.5" onClick={() => setMobileOpen(false)}>{p.name}</Link>
          ))}
          <div className="h-px my-2" style={{ backgroundColor: CORP_BORDER }} />
          {([['nav.ecosystem', '/ecosystem'], ['nav.company', '/company'], ['nav.insights', '/insights'], ['nav.careers', '/careers'], ['nav.talk', '/contact']] as [string, string][]).map(([key, href]) => (
            <Link key={href} href={href} className="block text-[14px] text-gray-600 py-1.5" onClick={() => setMobileOpen(false)}>{t(key)}</Link>
          ))}
          <div className="pt-2"><LangToggle /></div>
          <Link href="/#products" onClick={() => setMobileOpen(false)}
            className="block text-center px-5 py-3 rounded-xl text-white text-[14px] font-bold mt-3"
            style={{ backgroundColor: CORP_TEAL }}>
            {t('nav.explore')}
          </Link>
        </div>
      )}
    </nav>
  );
}

export function CorporateFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-5 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-2">
            <div className="text-[22px] font-black tracking-tight">ATTENDA</div>
            <div className="text-[11px] font-bold tracking-[0.32em] mt-1" style={{ color: CORP_TEAL_BRIGHT }}>TECHNOLOGIES</div>
            <p className="text-[14px] text-gray-400 mt-5 max-w-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">{t('footer.products')}</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              {PRODUCTS.map((p) => (
                <li key={p.href}><Link href={p.href} className="hover:text-white transition-colors">{p.name.replace('Attenda ', '')}</Link></li>
              ))}
              <li><Link href="/ecosystem" className="hover:text-white transition-colors">{t('nav.ecosystem')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">{t('footer.company')}</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              <li><Link href="/company" className="hover:text-white transition-colors">{t('footer.about')}</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">{t('nav.careers')}</Link></li>
              <li><Link href="/insights" className="hover:text-white transition-colors">{t('nav.insights')}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">{t('footer.legal')}</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('footer.security')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">{t('footer.contact')}</div>
            <div className="text-[14px] text-gray-300 leading-relaxed">
              Attenda Technologies LLC<br />66 W Flagler St<br />Suite 900<br />Miami, FL 33130<br />United States
            </div>
            <a href="mailto:support@attendaapp.com" className="text-[14px] mt-3 inline-block hover:text-white transition-colors" style={{ color: CORP_TEAL_BRIGHT }}>
              support@attendaapp.com
            </a>
          </div>
        </div>
        <div className="border-t mt-14 pt-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="text-[13px] text-gray-500">{t('footer.rights')}</div>
          <div className="text-[12px] text-gray-500">{t('footer.region')}</div>
        </div>
      </div>
    </footer>
  );
}