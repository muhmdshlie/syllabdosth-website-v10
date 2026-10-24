export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Demo mode: no Supabase keys → sample data, fake logins, in-memory writes. */
export const isDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;
/**
 * Demo logins (an unsigned role cookie) only work off Vercel. If a Vercel deployment ever loses its Supabase
 * keys it shows demo data, but nobody can sign in, so no one can pick the admin role.
 */
export const demoAuth = isDemo && !process.env.VERCEL;

export const CONTACT = {
  phone: '+91 99018 84692',
  phoneHref: 'tel:+919901884692',
  whatsapp: 'https://wa.me/919901884692',
  site: 'www.syllabdosth.com',
  email: 'support@syllabdosth.com',
  tagline: 'Learn Today, Lead Tomorrow.',
};

