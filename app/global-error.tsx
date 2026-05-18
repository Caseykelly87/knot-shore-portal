"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error] server component render failed", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  // Inline styles only — this boundary runs when the global layout/CSS
  // pipeline may have failed, so it cannot depend on Tailwind classes or
  // CSS variables from globals.css. Brand colors are inlined as hex.
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          margin: 0,
          padding: "4rem 1.5rem",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "#1c2b3a",
          color: "#f5f0e8",
        }}
      >
        <div style={{ maxWidth: "32rem", width: "100%" }}>
          <div
            style={{
              fontFamily: "Georgia, Cambria, Times New Roman, serif",
              fontSize: "0.95rem",
              color: "#7faaa0",
              marginBottom: "2rem",
              letterSpacing: "0.05em",
            }}
          >
            Knot Shore Grocery
          </div>
          <h1
            style={{
              fontFamily: "Georgia, Cambria, Times New Roman, serif",
              fontSize: "1.75rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
              color: "#f5f0e8",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginBottom: "1rem", lineHeight: 1.5, color: "#d4d0c4" }}>
            The portal hit an unexpected error while rendering this page.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.85rem",
                color: "#7faaa0",
                marginBottom: "1.5rem",
              }}
            >
              Digest: {error.digest}
            </p>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.95rem",
              background: "#7faaa0",
              color: "#1c2b3a",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
