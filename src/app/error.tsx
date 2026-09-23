"use client";

// Shown when part of the app fails to load (e.g. a script download dropped on
// a bad connection) instead of spinning forever.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="amc-error-page">
      <div className="amc-error-card">
        <small>something broke</small>
        <h1>Monday won this round.</h1>
        <p>The page didn&apos;t load properly. A reload usually fixes it.</p>
        <div className="amc-error-actions">
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
          <button type="button" className="is-ghost" onClick={() => reset()}>Try again</button>
        </div>
      </div>
    </main>
  );
}
