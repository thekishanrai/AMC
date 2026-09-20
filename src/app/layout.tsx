import type { Metadata, Viewport } from "next";
import { Bitcount_Grid_Single, Share_Tech, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const bitcountGridSingle = Bitcount_Grid_Single({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: "variable",
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
  title: "Anti Monday Club | Official Enemies of Boring Weekends",
  description:
    "We can't cancel Mondays. We can make the weekend before it unforgettable. Discover offbeat places for your next weekend trip.",
  openGraph: {
    title: "Anti Monday Club | Official Enemies of Boring Weekends",
    description:
      "We can't cancel Mondays. We can make the weekend before it unforgettable. Discover offbeat places for your next weekend trip.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bitcountGridSingle.variable} ${shareTech.variable} ${pressStart2P.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
