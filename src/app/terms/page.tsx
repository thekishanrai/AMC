import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Anti Monday Club",
  description: "Terms for using Anti Monday Club.",
};

const sections = [
  ["using-the-site", "Using the site", "Use Anti Monday Club for personal trip discovery and planning. Do not misuse the service, interfere with the site, or copy its content in bulk."],
  ["location-information", "Location information", "We work to keep distances, routes, seasons and access notes useful, but outdoor conditions change. Verify current access and local rules before leaving."],
  ["safety", "Safety and responsibility", "Outdoor travel carries risk. You are responsible for your route, weather checks, equipment, transport and decisions on the ground."],
  ["submissions", "User submissions", "If you request a location or send feedback, you confirm that you have the right to share that material. We may review and edit submissions before publishing."],
  ["third-party-links", "Third-party links", "Map, social and external links are run by other services. Their terms and privacy practices apply when you leave Anti Monday Club."],
  ["changes", "Changes to these terms", "We may update these terms as the site changes. The date at the top will show when the current version took effect."],
  ["contact", "Contact", "Questions about these terms can be sent through Contact us on the More page."],
] as const;

export default function TermsPage() {
  return (
    <main className="amc-terms-page">
      <header className="amc-terms-top">
        <Link href="/" className="amc-wordmark">ANTI MONDAY CLUB</Link>
        <Link href="/?section=account">← More</Link>
      </header>
      <article className="amc-terms-content">
        <h1>TERMS &amp;<br/>CONDITIONS</h1>
        <p className="amc-terms-updated">Last updated: 23 September 2026</p>
        <p className="amc-terms-intro">These terms explain how Anti Monday Club works, what we provide, and what you agree to when using the site.</p>
        <nav className="amc-terms-toc" aria-label="On this page">
          {sections.map(([id, title], index) => <a key={id} href={`#${id}`}>{String(index + 1).padStart(2, "0")} / {title}</a>)}
        </nav>
        {sections.map(([id, title, copy], index) => (
          <section id={id} key={id}>
            <h2>{String(index + 1).padStart(2, "0")} / {title}</h2>
            <p>{copy}</p>
          </section>
        ))}
        <aside>This page is structured so the legal copy can be replaced without changing the layout.</aside>
      </article>
    </main>
  );
}
