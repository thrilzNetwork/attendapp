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
    default: "Attenda — Hotel Operations Platform for Independent Properties",
    template: "%s | Attenda",
  },
  description:
    "Attenda connects guests, staff, vendors, and GMs into one thread. QR-code guest requests, staff task logs, vendor portals, and GM dashboards — built for independent hotels that run lean.",
  keywords: [
    "hotel operations software",
    "independent hotel management",
    "guest request system",
    "hotel QR code app",
    "hotel staff dashboard",
    "hotel vendor portal",
    "GM dashboard for hotels",
    "hotel operations platform",
    "boutique hotel software",
    "hotel task management",
    "Best Western operations tool",
    "Florida hotel software",
    "hotel revenue tracking",
  ],
  authors: [{ name: "Alejandro Soria", url: "https://attendaapp.com" }],
  creator: "Attenda",
  publisher: "Attenda",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Attenda",
    title: "Attenda — One Thread. Every Role. Every Room.",
    description:
      "QR-code guest requests → staff executes → GM sees everything. Built for independent hotels that run lean. No app downloads. No rip-and-replace.",
    url: CANONICAL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Attenda — Hotel Operations Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Attenda — Hotel Operations Platform",
    description:
      "QR-code guest requests, staff task logs, vendor portals, and GM dashboards. One thread for every role.",
    images: ["/og-image.png"],
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
