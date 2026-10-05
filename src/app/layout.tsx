import type { Metadata, Viewport } from "next";
import { Bitcount_Grid_Single, Jersey_25, Share_Tech, Press_Start_2P } from "next/font/google";
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

const SITE_TITLE = "Anti Monday Club | Bury Monday Somewhere Scenic";
const SITE_DESCRIPTION =
  "We pick the spot. You bring the shovel. Offbeat places, hidden spots and weekend escapes Monday will never find.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Anti Monday Club",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
      <head><link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous"/><link rel="dns-prefetch" href="https://api.mapbox.com"/></head><body className="min-h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
