// Content Security Policy. Next.js 14 and the Meta Pixel loader use inline scripts, so script-src keeps
// 'unsafe-inline' (nonces would make every page dynamic); the policy still limits where scripts load from
// and where data can be sent. Google Analytics domains follow Google's GA4 CSP guide. React's dev tools
// need eval, so 'unsafe-eval' is added in development only.
const dev = process.env.NODE_ENV !== 'production';
// Google login goes from our server action to this project's Supabase auth page, then to Google.
const supabaseOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin; } catch { return ''; }
})();
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://*.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:", // course and CMS images can come from any https host
  "font-src 'self' data:",
  // The browser never calls Supabase directly (only our own server does), so it is not listed here.
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.facebook.com",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''} https://accounts.google.com`,
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  // No remotePatterns: the site doesn't use next/image, so /_next/image must not fetch and process images
  // from other hosts (the image optimizer is where several Next.js advisories are).
  images: {},
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
