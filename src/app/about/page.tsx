import type { Metadata } from "next";

const CANONICAL = "https://attendaapp.com";
const TEAL = "#158A7C";
const TEAL_BRIGHT = "#15b79e";

export const metadata: Metadata = {
  title: "About — Meet the Team Behind Attenda",
  description:
    "Attenda is being built by people who understand that hotel technology only works when it works for the people actually running the hotel. Meet the team behind one operating system for hotels.",
  alternates: { canonical: `${CANONICAL}/about` },
  openGraph: {
    type: "website",
    title: "About — Meet the Team Behind Attenda",
    description:
      "Hotel operations, client service, sales, business development, field execution, and financial expertise — building Attenda around the people who actually operate hotels.",
    url: `${CANONICAL}/about`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About Attenda" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — Attenda",
    description: "Meet the team behind Attenda — one operating system for hotels.",
    images: ["/og-image.png"],
  },
};

const TEAM = [
  {
    name: "Fabian",
    role: "Co-Founder",
    initials: "F",
    bio: [
      "Fabian supports Attenda’s business strategy, partnerships, growth, and long-term expansion. As Co-Founder, he works alongside Alejandro to develop opportunities and help turn Attenda’s vision into a scalable hospitality business.",
    ],
  },
  {
    name: "Francisca",
    role: "Onboarding & Client Relations",
    initials: "F",
    bio: [
      "Francisca helps turn a new Attenda customer into a successful Attenda property. She supports onboarding, implementation coordination, client relationships, and ongoing communication to help hotels get value from the platform from the beginning.",
    ],
  },
  {
    name: "Andres",
    role: "Support & Business Development",
    initials: "A",
    bio: [
      "Andres works across customer support and business development, helping properties navigate Attenda while also identifying new opportunities for the company. His role connects what we hear from hotels with how Attenda continues to grow.",
    ],
  },
  {
    name: "Su",
    role: "Sales & Revenue",
    initials: "S",
    bio: [
      "Su focuses on sales, hotel acquisition, revenue opportunities, and commercial growth. Her role is centered on developing relationships and bringing Attenda to more hotel operators and ownership groups.",
    ],
  },
  {
    name: "Juan",
    role: "Field Operations",
    initials: "J",
    bio: [
      "Juan brings Attenda closer to the property level. His focus is field operations, implementation support, and understanding how workflows perform in real hotel environments — where execution matters more than theory.",
    ],
  },
  {
    name: "Drhasti",
    role: "Finance & Controls",
    initials: "D",
    bio: [
      "Drhasti is being considered for Attenda’s controller function as the company grows, supporting financial controls, reporting, accounting structure, and the financial discipline required to scale responsibly.",
    ],
  },
];

const OPERATIONS_LIST = [
  "The front desk",
  "Housekeeping",
  "Maintenance",
  "Transportation",
  "Food & beverage",
  "Managers",
  "Owners",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-5 h-14 md:h-16 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <img src="/brand/logo-primary.svg" alt="Attenda" className="h-6 sm:h-7 md:h-9 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-7">
            <a href="/#pillars" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Platform</a>
            <a href="/#modules" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Product</a>
            <a href="/#revenue" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Case Study</a>
            <a href="/blog" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Field Notes</a>
            <a href="/about" className="text-[14px] text-gray-900 font-bold">About</a>
            <a href="/staff" className="text-[14px] text-gray-600 hover:text-gray-900 font-medium">Log in</a>
            <a href="/#demo"
              className="px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-[0.97] shadow-sm"
              style={{ backgroundColor: TEAL }}>
              Apply
            </a>
          </div>
          <a href="/#demo" className="md:hidden px-4 py-2 rounded-lg text-white text-[12px] font-bold"
            style={{ backgroundColor: TEAL }}>Apply</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-16 md:py-24 px-5 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">About Attenda</h2>
          <h1 className="text-[34px] md:text-[52px] font-black tracking-tight text-gray-900 mb-6 leading-[1.05]">
            Meet the Team<br />Behind Attenda
          </h1>
          <p className="text-[16px] md:text-[18px] text-gray-600 leading-relaxed mb-5">
            Attenda is being built by people who understand that hotel technology only works when it works for the people actually running the hotel.
          </p>
          <p className="text-[16px] md:text-[18px] text-gray-600 leading-relaxed">
            Our team brings together hotel operations, client service, sales, business development, field execution, and financial expertise. We’re building Attenda around a simple principle:{" "}
            <span className="font-bold text-gray-900">technology should make hotel operations easier to execute, easier to understand, and easier to manage.</span>
          </p>
        </div>
      </section>

      {/* FOUNDER — FEATURED */}
      <section className="py-8 md:py-12 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              <div className="md:col-span-2 bg-gradient-to-br from-gray-100 to-gray-50 p-8 md:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex items-center justify-center text-white text-[48px] font-black mb-4 shadow-lg" style={{ backgroundColor: TEAL }}>AS</div>
                <div className="text-[20px] font-black text-gray-900">Alejandro Soria</div>
                <div className="text-[14px] font-semibold mt-1" style={{ color: TEAL }}>Founder</div>
              </div>
              <div className="md:col-span-3 p-8 md:p-10">
                <div className="text-[12px] uppercase tracking-widest text-gray-500 font-bold mb-3">15 years in hotel operations</div>
                <p className="text-[16px] text-gray-700 leading-relaxed mb-5">
                  A hotel operator with 15 years of hospitality experience across nearly every level of hotel operations. Alejandro’s career has taken him from Houseman, Housekeeping, Maintenance, Front Desk, and Night Audit through Assistant General Manager, General Manager, and hotel operations leadership.
                </p>
                <blockquote className="border-l-4 pl-4 py-2" style={{ borderColor: TEAL }}>
                  <p className="text-[17px] font-bold text-gray-900 italic leading-snug">
                    That operator experience is the foundation behind Attenda: technology designed around how hotels actually operate — not how someone outside the industry thinks they operate.
                  </p>
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM GRID */}
      <section className="py-16 md:py-20 px-5 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[14px] font-bold tracking-widest uppercase text-gray-500 mb-3">The team</h2>
            <h3 className="text-[30px] md:text-[40px] font-black tracking-tight text-gray-900 leading-[1.08]">
              Operators, builders, and closer-to-the-property people.
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-[20px] font-black shadow-sm shrink-0" style={{ backgroundColor: TEAL }}>
                    {member.initials}
                  </div>
                  <div>
                    <div className="text-[18px] font-black text-gray-900 leading-tight">{member.name}</div>
                    <div className="text-[13px] font-bold mt-0.5" style={{ color: TEAL }}>{member.role}</div>
                  </div>
                </div>
                {member.bio.map((p, i) => (
                  <p key={i} className="text-[14px] text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FROM HOTEL OPERATIONS OUT — dark closing statement */}
      <section className="py-20 md:py-28 px-5 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(21,134,124,0.25), transparent)' }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-[14px] font-bold tracking-widest uppercase mb-3" style={{ color: '#5eead4' }}>Our approach</h2>
          <h3 className="text-[30px] md:text-[44px] font-black tracking-tight text-white mb-6 leading-[1.08]">
            Built From Hotel Operations Out
          </h3>
          <p className="text-[16px] md:text-[18px] text-white/80 leading-relaxed mb-6">
            We’re not building technology and then looking for a hotel problem to solve.
          </p>
          <p className="text-[20px] md:text-[24px] font-black text-white mb-8">We started with the hotel.</p>
          <div className="flex flex-wrap justify-center gap-2.5 mb-8">
            {OPERATIONS_LIST.map((item) => (
              <span key={item} className="px-4 py-2 rounded-full border border-white/20 bg-white/10 text-[13px] font-bold text-white/90">
                {item}
              </span>
            ))}
          </div>
          <p className="text-[16px] md:text-[18px] text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">
            The daily handoffs, missed follow-ups, checklists, questions, and operational decisions that determine whether a property runs calmly or spends the day reacting.
          </p>
          <p className="text-[15px] md:text-[16px] text-white/70 font-semibold mb-3">Attenda is our answer to that complexity:</p>
          <p className="text-[22px] md:text-[30px] font-black leading-snug">
            <span style={{ color: '#5eead4' }}>One operating system for hotels.</span>{" "}
            <span className="text-white">Built around the people who actually operate them.</span>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-5 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-[26px] md:text-[34px] font-black tracking-tight text-gray-900 mb-4 leading-tight">
            Want to see what this team is building?
          </h3>
          <p className="text-[16px] text-gray-600 mb-8 max-w-xl mx-auto">
            Attenda is live at a founding property and onboarding new hotels now. Talk to the people behind the platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:support@attendaapp.com"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] text-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ backgroundColor: TEAL_BRIGHT }}>
              Talk to the team
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
            <a href="/#demo"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors">
              See Attenda in action
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-5 border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Software</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="/#modules" className="hover:text-gray-900">Guest Requests</a></li>
                <li><a href="/#modules" className="hover:text-gray-900">Staff Task Log</a></li>
                <li><a href="/#modules" className="hover:text-gray-900">Vendor Portal</a></li>
                <li><a href="/#modules" className="hover:text-gray-900">GM Dashboard</a></li>
                <li><a href="/#modules" className="hover:text-gray-900">Knowledge Base</a></li>
                <li><a href="/#modules" className="hover:text-gray-900">Shuttle &amp; Transport</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Company</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="/#revenue" className="hover:text-gray-900">Case Study</a></li>
                <li><a href="/about" className="hover:text-gray-900 font-bold">About Us</a></li>
                <li><a href="/#platform" className="hover:text-gray-900">Platform</a></li>
                <li><a href="/staff" className="hover:text-gray-900">Staff Login</a></li>
                <li><a href="mailto:support@attendaapp.com" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Resources</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li><a href="/#demo" className="hover:text-gray-900">Schedule a Demo</a></li>
                <li><a href="/blog" className="hover:text-gray-900">Field Notes Blog</a></li>
                <li><a href="/#platform" className="hover:text-gray-900">Feature Tour</a></li>
                <li><a href="/#revenue" className="hover:text-gray-900">Customer Stories</a></li>
                <li><a href="/privacy" className="hover:text-gray-900">Privacy</a></li>
                <li><a href="/terms" className="hover:text-gray-900">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-[14px] text-gray-700">
                <li>support@attendaapp.com</li>
                <li>Miami, FL</li>
                <li className="pt-2">
                  <a href="/#demo"
                    className="inline-block px-4 py-2 rounded-lg text-white text-[12px] font-bold"
                    style={{ backgroundColor: TEAL }}>
                    Get a Demo
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/brand/icon-mark.svg" alt="Attenda" className="h-6 sm:h-7 w-auto" />
              <span className="text-[13px] text-gray-600">attenda &mdash; the operations platform for independent hotels</span>
            </div>
            <div className="text-[12px] text-gray-500">
              &copy; 2026 Attenda. All rights reserved.
              <p className="text-[10px] text-gray-400 mt-1">This property is independently owned and operated.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}