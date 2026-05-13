"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary — catches errors thrown in the root layout
 * itself. Renders its own <html>/<body> because layout has failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "global.error",
        error: error.message,
        digest: error.digest,
        stack: error.stack,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#020617",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
            Something went badly wrong
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
            The page couldn&apos;t render at all. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#34d399",
              color: "#020617",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
