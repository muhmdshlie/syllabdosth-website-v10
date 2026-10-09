import withPWA from '@ducanh2912/next-pwa';
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Admin course form uploads cover images (up to 5 MB) through a server action.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] },
};
export default withPWA({
  dest: 'public',
})(nextConfig);
