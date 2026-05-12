import type { Metadata } from "next";
import "./globals.css";
import { GuestProvider } from "@/lib/guest-context";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Attenda - Guest Services",
  description: "Your hospitality companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <body className="antialiased bg-[#F5F5F5] text-gray-900 font-sans">
      <GuestProvider>
        {children}
        <CookieBanner />
      </GuestProvider>
    </body>
    </html>
  );
}
