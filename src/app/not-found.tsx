import Link from "next/link";

export default function NotFound() {
  return (
    <main className="amc-404-page">
      <header className="amc-static-topbar">
        <Link href="/" className="amc-wordmark">ANTI MONDAY CLUB</Link>
        <span>broken link</span>
      </header>
      <section className="amc-404-main">
        <div className="amc-404-code">404<span>?</span></div>
        <div className="amc-pixel-trekker" aria-label="A lost pixel trekker" />
        <div className="amc-404-copy">
          <h1>THIS TRAIL GOES NOWHERE.</h1>
          <p>The page wandered off. Monday probably gave it directions.</p>
        </div>
        <nav className="amc-404-actions" aria-label="404 recovery links">
          <Link href="/">BACK TO MAP</Link>
          <Link href="/?section=surprise">SURPRISE ME</Link>
        </nav>
        <p className="amc-404-hint">If this link should work, report it from More.</p>
        <div className="amc-404-trail" aria-hidden="true">· · · ↑ · · ·</div>
      </section>
    </main>
  );
}
