import type { Metadata, Viewport } from "next";
import { Bitcount_Grid_Single, Jersey_25, Share_Tech, Press_Start_2P } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const bitcountGridSingle = Bitcount_Grid_Single({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: "variable",
});

const jersey25 = Jersey_25({
  variable: "--font-home-headline",
  subsets: ["latin"],
  weight: "400",
});

const shareTech = Share_Tech({
  variable: "--font-body",
  subsets: ["latin"],
  weight: "400",
});

const pressStart2P = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Anti Monday Club",
  openGraph: { siteName: "Anti Monday Club" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bitcountGridSingle.variable} ${jersey25.variable} ${shareTech.variable} ${pressStart2P.variable} h-full antialiased`}
    >
      <head><link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous"/><link rel="dns-prefetch" href="https://api.mapbox.com"/></head><body className="min-h-full flex flex-col overflow-hidden">
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-TB7FQ6ZL"
          strategy="afterInteractive"
        />
        <Script id="gtm-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());`}
        </Script>
        {children}<Analytics /></body>
    </html>
  );
}
