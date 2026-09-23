import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Anti Monday Club",
  description: "Why Anti Monday Club maps Maharashtra's best weekend escapes.",
};

export default function AboutPage() {
  return (
    <main className="amc-about-page">
      <header className="amc-static-topbar">
        <Link href="/" className="amc-wordmark">ANTI MONDAY CLUB</Link>
        <span>our story</span>
      </header>
      <article className="amc-about-content">
        <section className="amc-about-hero">
          <span>started with one question</span>
          <h1>WHERE DO WE<br/>GO THIS<br/>WEEKEND?</h1>
          <p>Anti Monday Club is the answer we&apos;re still building.</p>
        </section>
        <section className="amc-about-story">
          <div><span>chapter 01</span><h2>TOO MANY SAVED REELS.</h2><p>Places everywhere. Useful information nowhere. We wanted one map that told us what was close, what was worth it, and how to get there.</p></div>
          <div><span>chapter 02</span><h2>ONE MAP FOR THE WEEKEND.</h2><p>Treks, waterfalls, camps and odd little exits across Maharashtra - sorted by where you are and how far you&apos;ll go.</p></div>
          <div><span>chapter 03</span><h2>BUILT FOR PEOPLE WHO NEED MONDAY LESS.</h2><p>No influencer itinerary. Just enough truth to pick a place, pack a bag and leave.</p></div>
        </section>
        <section className="amc-about-open"><h2>THE CLUB IS OPEN.</h2><p>Find a place. Share a place. Request the place we&apos;re missing.</p></section>
        <p className="amc-about-closing">THE WEEKEND IS SHORT.<br/>THE MAP SHOULDN&apos;T BE.</p>
      </article>
    </main>
  );
}
