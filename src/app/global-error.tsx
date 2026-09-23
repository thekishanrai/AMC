"use client";

// Last-resort boundary when the root layout itself fails. It renders its own
// <html>, so styles are inline and the fonts fall back to system ones.
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fe5000", color: "#111", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 360, margin: 20, padding: 24, background: "#fffaf2", border: "3px solid #000", borderRadius: 20, boxShadow: "6px 6px 0 #000" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, lineHeight: 1 }}>Monday won this round.</h1>
          <p style={{ margin: "0 0 16px", fontSize: 15 }}>Anti Monday Club didn&apos;t load properly. A reload usually fixes it.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "12px 18px", fontSize: 15, fontWeight: 700, background: "#111", color: "#fe5000", border: 0, borderRadius: 12 }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
