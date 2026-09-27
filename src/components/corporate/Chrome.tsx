'use client';

/* Attenda Technologies — shared corporate chrome (nav + footer).
   Used by every corporate page: /, /hospitality, /transportation, /ecosystem,
   /company, /insights, /contact. Product pages may layer their own sub-brand
   accent but keep this chrome so the parent brand stays recognizable. */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';

export const CORP_INK = '#0F172A';
export const CORP_TEAL = '#158A7C';
export const CORP_TEAL_BRIGHT = '#15b79e';
export const CORP_SLATE = '#475569';
export const CORP_MIST = '#F8FAFC';
export const CORP_BORDER = '#E2E8F0';

export const PRODUCTS = [
  { name: 'Attenda Hospitality', href: '/hospitality', desc: 'Technology for hotel operations.' },
  { name: 'Attenda Serve', href: '/serve', desc: 'Your business. Your channel. Your customers.' },
  { name: 'Attenda Transportation', href: '/transportation', desc: 'Scheduling, dispatch & live vehicle operations.' },
] as const;

export function CorporateLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="leading-none">
        <div className={`text-[17px] font-black tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>
          ATTENDA
        </div>
        <div className="text-[9px] font-bold tracking-[0.32em] mt-0.5" style={{ color: CORP_TEAL_BRIGHT }}>
          TECHNOLOGIES
        </div>
      </div>
    </Link>
  );
}

export function CorporateNav() {
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (typeof window !== 'undefined') {
    // passive scroll listener (re-mounted per navigation in practice)
    window.addEventListener('scroll', () => setScrolled(window.scrollY > 12), { passive: true, once: false });
  }

  return (
    <nav className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-5 h-16 flex items-center justify-between">
        <CorporateLogo />
        <div className="hidden lg:flex items-center gap-7">
          <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
            <button className="flex items-center gap-1 text-[14px] font-medium text-gray-600 hover:text-gray-900">
              Products <ChevronDown size={14} className={`transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
            </button>
            {productsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[340px]">
                <div className="bg-white rounded-2xl shadow-xl border p-2" style={{ borderColor: CORP_BORDER }}>
                  {PRODUCTS.map((p) => (
                    <Link key={p.href} href={p.href}
                      className="block px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="text-[14px] font-bold text-gray-900">{p.name}</div>
                      <div className="text-[12.5px] text-gray-500 mt-0.5">{p.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/ecosystem" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Ecosystem</Link>
          <Link href="/company" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Company</Link>
          <Link href="/insights" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Insights</Link>
          <Link href="/careers" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Careers</Link>
          <Link href="/contact" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Talk to Attenda</Link>
          <Link href="/#products"
            className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
            style={{ backgroundColor: CORP_TEAL }}>
            Explore our products
          </Link>
        </div>
        <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t px-5 py-4 space-y-3" style={{ borderColor: CORP_BORDER }}>
          {PRODUCTS.map((p) => (
            <Link key={p.href} href={p.href} className="block text-[15px] font-bold text-gray-900 py-1.5" onClick={() => setMobileOpen(false)}>{p.name}</Link>
          ))}
          <div className="h-px my-2" style={{ backgroundColor: CORP_BORDER }} />
          {[['Ecosystem', '/ecosystem'], ['Company', '/company'], ['Insights', '/insights'], ['Careers', '/careers'], ['Contact', '/contact']].map(([l, h]) => (
            <Link key={h} href={h} className="block text-[14px] text-gray-600 py-1.5" onClick={() => setMobileOpen(false)}>{l}</Link>
          ))}
          <Link href="/#products" onClick={() => setMobileOpen(false)}
            className="block text-center px-5 py-3 rounded-xl text-white text-[14px] font-bold mt-3"
            style={{ backgroundColor: CORP_TEAL }}>
            Explore our products <ArrowRight size={15} className="inline" />
          </Link>
        </div>
      )}
    </nav>
  );
}

export function CorporateFooter() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-5 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-2">
            <div className="text-[22px] font-black tracking-tight">ATTENDA</div>
            <div className="text-[11px] font-bold tracking-[0.32em] mt-1" style={{ color: CORP_TEAL_BRIGHT }}>TECHNOLOGIES</div>
            <p className="text-[14px] text-gray-400 mt-5 max-w-xs leading-relaxed">
              Technology for the people who keep business moving.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Products</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              {PRODUCTS.map((p) => (
                <li key={p.href}><Link href={p.href} className="hover:text-white transition-colors">{p.name.replace('Attenda ', '')}</Link></li>
              ))}
              <li><Link href="/ecosystem" className="hover:text-white transition-colors">Ecosystem</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Company</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              <li><Link href="/company" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/insights" className="hover:text-white transition-colors">Insights</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Legal</div>
            <ul className="space-y-2.5 text-[14px] text-gray-300">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/privacy#security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Contact</div>
            <div className="text-[14px] text-gray-300 leading-relaxed">
              Attenda Technologies LLC<br />66 W Flagler St<br />Suite 900<br />Miami, FL 33130<br />United States
            </div>
            <a href="mailto:support@attendaapp.com" className="text-[14px] mt-3 inline-block hover:text-white transition-colors" style={{ color: CORP_TEAL_BRIGHT }}>
              support@attendaapp.com
            </a>
          </div>
        </div>
        <div className="border-t mt-14 pt-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="text-[13px] text-gray-500">© 2026 Attenda Technologies LLC. All rights reserved.</div>
          <div className="text-[12px] text-gray-500">Miami, FL · Operating across the U.S. and Latin America</div>
        </div>
      </div>
    </footer>
  );
}