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

export const metadata: Metadata = {
  title: "Attenda — Your Property's Operations Engine",
  description:
    "Attenda connects properties to local restaurants and drivers, eliminates repetitive staff tasks, and generates direct revenue — so the guest wins, the restaurant wins, the property wins, and the community wins.",
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
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="antialiased bg-[#F5F5F5] text-ink-900 font-sans">
        <GuestProvider>
          {children}
          <CookieBanner />
        </GuestProvider>
      </body>
    </html>
  );
}
