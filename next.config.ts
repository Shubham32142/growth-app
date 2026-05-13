import type { NextConfig } from "next";

const securityHeaders = [
  // Defence-in-depth headers. CSP is intentionally permissive on
  // inline-script ('unsafe-inline') because Next.js + framer-motion + the
  // Supabase auth bootstrap inject inline styles/scripts. Tighten via nonces
  // when we add a CSP nonce middleware (post-v1).
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.supabase.co https://openrouter.ai https://api.tavily.com https://*.youtube.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
