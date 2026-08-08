import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { GuestProvider } from "@/lib/guest-context";
import CookieBanner from "@/components/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const CANONICAL = "https://attendaapp.com";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL),
  icons: {
    icon: [
      { url: "/brand/icon-mark.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/brand/icon-mark.svg",
  },
  title: {
    default: "Attenda Presence — Realtime Front Desk Presence System",
    template: "%s | Attenda",
  },
  description:
    "Attenda Presence is a realtime system for single-coverage hotel front desks. A kiosk display shows when staff is attended or away, a phone console lets staff step away with a reason and countdown, and an admin dashboard logs it all.",
  keywords: [
    "hotel front desk presence",
    "hotel staff attendance system",
    "front desk kiosk display",
    "hotel staff away status",
    "realtime hotel operations",
    "independent hotel software",
    "hotel operations platform",
    "boutique hotel software",
    "single coverage front desk",
    "hotel guest assistance system",
  ],
  authors: [{ name: "Alejandro Soria", url: "https://attendaapp.com" }],
  creator: "Attenda",
  publisher: "Attenda",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Attenda",
    title: "Attenda Presence — Never a Silent Front Desk",
    description:
      "Every guest knows you're there. Every staff member knows when you step away. A realtime presence system for single-coverage hotel front desks.",
    url: CANONICAL,
    images: [
      {
        url: "/images/presence-hero.jpg",
        width: 1600,
        height: 893,
        alt: "Attenda Presence — tablet kiosk at a boutique hotel front desk",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Attenda Presence — Never a Silent Front Desk",
    description:
      "A realtime presence system for single-coverage front desks. Kiosk display, staff console, admin dashboard.",
    images: ["/images/presence-hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: CANONICAL,
  },
  category: "hotel technology",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Attenda",
        url: CANONICAL,
        logo: `${CANONICAL}/og-image.png`,
        description:
          "Hotel operations platform connecting guests, staff, vendors, and GMs on one thread.",
        email: "thrilznetwork@gmail.com",
        founder: {
          "@type": "Person",
          name: "Alejandro Soria",
        },
        sameAs: [
          "https://attendaapp.com",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Attenda",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Hotel operations platform with QR guest requests, staff dashboards, vendor portals, and GM analytics.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        author: {
          "@type": "Person",
          name: "Alejandro Soria",
        },
      },
      {
        "@type": "WebSite",
        name: "Attenda",
        url: CANONICAL,
        description:
          "Hotel operations platform for independent properties. Connect guest requests, staff tasks, vendor jobs, and GM oversight on one thread.",
        potentialAction: {
          "@type": "SearchAction",
          target: `${CANONICAL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Canonical from metadata handles this */}
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-[#F5F5F5] text-ink-900 font-sans">
        <GuestProvider>
          {children}
          <CookieBanner />
        </GuestProvider>
      </body>
    </html>
  );
}
