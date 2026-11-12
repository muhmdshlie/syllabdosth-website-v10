/**
 * A redirect target from the URL or a form (`?next=`), allowed only if it stays on this website.
 * Returns '' otherwise. Browsers read `/\evil.com` as `//evil.com` and drop tabs and newlines, so a
 * startsWith('//') check alone is not enough: the path is resolved and must keep our origin.
 */
export function safePath(v: unknown): string {
  const s = typeof v === 'string' ? v : '';
  if (!s.startsWith('/') || s.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(s)) return '';
  try {
    const base = 'https://same.origin';
    const u = new URL(s, base);
    return u.origin === base ? `${u.pathname}${u.search}${u.hash}` : '';
  } catch {
    return '';
  }
}
