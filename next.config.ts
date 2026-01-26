import type { NextConfig } from "next";

// Content Security Policy
// Allows: self, Clerk auth, Convex backend, PostHog analytics, GitHub avatars
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.armory.dev https://*.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://img.clerk.com https://*.clerk.accounts.dev",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.convex.cloud https://*.clerk.accounts.dev https://clerk.armory.dev https://*.posthog.com wss://*.convex.cloud",
  "frame-src 'self' https://*.clerk.accounts.dev",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: cspDirectives,
        },
        {
          key: "X-Permitted-Cross-Domain-Policies",
          value: "none",
        },
      ],
    },
  ],
};

export default nextConfig;
