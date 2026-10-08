import 'server-only';
import { cache } from 'react';
import type { Field, Row } from '../admin/types';
import { isDemo } from '../config';
import { table } from '../store';
import { createAdminClient } from '../supabase/server';
import { CONTENT, mergeContent } from './schema';

/** All saved content rows, loaded once per request. */
const loadAll = cache(async (): Promise<Record<string, Row>> => {
  if (isDemo) return Object.fromEntries(table<{ key: string; value: Row }>('site_content').map((r) => [r.key, r.value]));
  try {
    const { data, error } = await createAdminClient().from('site_content').select('key,value');
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r: { key: string; value: Row }) => [r.key, r.value]));
  } catch {
    return {}; // table not created yet (migration 0003 not run): fall back to defaults
  }
});

/** Saved content merged over the defaults. Always returns a complete object. */
export async function getContent<T extends Row = Row>(key: string): Promise<T> {
  const def = CONTENT[key];
  if (!def) throw new Error(`Unknown content key ${key}`);
  const saved = (await loadAll())[key];
  return mergeContent(def.defaults as T, saved);
}

/** Only what was saved (no defaults) — used by the editor to show "changed" state. */
export async function getSavedContent(key: string): Promise<Row | null> {
  return (await loadAll())[key] ?? null;
}

function passwordPaths(fields: Field[], prefix: string[] = []): string[][] {
  return fields.flatMap((f) => f.type === 'password' ? [[...prefix, f.name]] : f.type === 'group' ? passwordPaths(f.fields ?? [], [...prefix, f.name]) : []);
}
const getPath = (o: Row, p: string[]) => p.reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Row)[k] : undefined), o);
function setPath(o: Row, p: string[], v: unknown) {
  let x: Row = o;
  for (const k of p.slice(0, -1)) { x[k] = (x[k] && typeof x[k] === 'object' ? x[k] : {}) as Row; x = x[k] as Row; }
  x[p[p.length - 1]] = v;
}

/** Copy of the content with passwords removed (safe to send to the browser). */
export function withoutSecrets(key: string, value: Row): { value: Row; secretsSet: string[] } {
  const def = CONTENT[key];
  const copy = JSON.parse(JSON.stringify(value)) as Row;
  const secretsSet: string[] = [];
  for (const p of passwordPaths(def?.fields ?? [])) {
    if (getPath(copy, p)) secretsSet.push(p.join('.'));
    setPath(copy, p, '');
  }
  return { value: copy, secretsSet };
}

export async function saveContent(key: string, value: Row, userId: string | null) {
  const def = CONTENT[key];
  if (!def) throw new Error('Unknown section');
  // Blank password fields mean "keep the saved one".
  const current = await getContent(key);
  for (const p of passwordPaths(def.fields)) if (!getPath(value, p)) setPath(value, p, getPath(current, p) ?? '');
  if (isDemo) {
    const t = table<{ key: string; value: Row; updated_at: string }>('site_content');
    const row = t.find((r) => r.key === key);
    if (row) { row.value = value; row.updated_at = new Date().toISOString(); } else t.push({ key, value, updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await createAdminClient().from('site_content').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'key' });
  if (error) throw new Error(error.message.includes('site_content') ? 'Run supabase/migrations/0003_admin_panel.sql in Supabase first.' : error.message);
}

export async function resetContent(key: string) {
  if (isDemo) {
    const t = table<{ key: string }>('site_content');
    const i = t.findIndex((r) => r.key === key);
    if (i >= 0) t.splice(i, 1);
    return;
  }
  const { error } = await createAdminClient().from('site_content').delete().eq('key', key);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ typed helpers for pages */
export type GeneralSettings = { siteName: string; tagline: string; phone: string; whatsapp: string; email: string; site: string; address: string; socials: Record<string, string> };
export type Branding = { logoDark: string; logoLight: string; favicon: string; themeColor: string };

export async function getSiteSettings() {
  const [general, branding] = await Promise.all([getContent<GeneralSettings>('settings.general'), getContent<Branding>('settings.branding')]);
  const digits = String(general.whatsapp || '').replace(/\D/g, '');
  return {
    ...general,
    phoneHref: `tel:${String(general.phone || '').replace(/[^\d+]/g, '')}`,
    whatsappUrl: digits ? `https://wa.me/${digits}` : '',
    logoDark: branding.logoDark || '/logo-noir.png',
    logoLight: branding.logoLight || '/logo-white.png',
    favicon: branding.favicon,
    themeColor: branding.themeColor || '#0B0B0B',
  };
}
export type SiteSettings = Awaited<ReturnType<typeof getSiteSettings>>;
