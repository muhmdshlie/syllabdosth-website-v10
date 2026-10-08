import 'server-only';
/**
 * Generic database access for the admin panel. Works on Supabase (service-role key, called only
 * after requireRole(['admin'])) and on the demo in-memory tables.
 */
import { isDemo } from '../config';
import { newId, table } from '../store';
import { createAdminClient } from '../supabase/server';
import { RESOURCES } from './resources';
import type { Option, Resource, Row } from './types';
import { slugify } from './validate';

const db = () => createAdminClient();

export type ListQuery = { q?: string; filters?: Record<string, string>; page?: number; perPage?: number; sort?: string; dir?: 'asc' | 'desc'; from?: string; to?: string };

const CREATED: Record<string, boolean> = { categories: false, email_templates: false, sms_templates: false, course_lessons: true };
const hasCreated = (t: string) => CREATED[t] ?? true;

function sortOf(r: Resource, q: ListQuery) {
  if (q.sort && (r.columns.some((c) => c.name === q.sort) || q.sort === 'created_at')) return { col: q.sort, asc: q.dir === 'asc' };
  if (r.defaultSort) return { col: r.defaultSort.col, asc: !!r.defaultSort.asc };
  return hasCreated(r.table) ? { col: 'created_at', asc: false } : { col: r.pk, asc: true };
}

const cleanSearch = (s: string) => s.replace(/[,()*%\\]/g, ' ').trim().slice(0, 80);

function matchDemo(row: Row, r: Resource, q: ListQuery) {
  for (const [k, v] of Object.entries({ ...(q.filters ?? {}), ...(r.baseFilter ?? {}) })) {
    if (v === '' || v === undefined) continue;
    const cell = row[k];
    if (Array.isArray(cell) ? !cell.map(String).includes(v) : String(cell ?? '') !== v) return false;
  }
  if (q.from && String(row.created_at ?? '') < q.from) return false;
  if (q.to && String(row.created_at ?? '') > `${q.to}T23:59:59.999Z`) return false;
  if (q.q && r.search?.length) {
    const needle = q.q.toLowerCase();
    if (!r.search.some((c) => String(row[c] ?? '').toLowerCase().includes(needle))) return false;
  }
  return true;
}

export async function listRecords(r: Resource, q: ListQuery = {}): Promise<{ rows: Row[]; total: number }> {
  const perPage = q.perPage ?? r.perPage ?? 20;
  const page = Math.max(1, q.page ?? 1);
  const { col, asc } = sortOf(r, q);
  if (isDemo) {
    const all = table<Row>(r.table).filter((row) => matchDemo(row, r, q));
    all.sort((a, b) => {
      const x = a[col] as never, y = b[col] as never;
      const c = x === y ? 0 : x === null || x === undefined ? 1 : y === null || y === undefined ? -1 : x > y ? 1 : -1;
      return asc ? c : -c;
    });
    return { rows: all.slice((page - 1) * perPage, page * perPage), total: all.length };
  }
  let query = db().from(r.table).select('*', { count: 'exact' });
  for (const [k, v] of Object.entries({ ...(q.filters ?? {}), ...(r.baseFilter ?? {}) })) {
    if (v === '' || v === undefined) continue;
    const f = r.fields.find((x) => x.name === k);
    query = f && (f.type === 'multirelation' || f.type === 'multiselect') ? query.contains(k, [v]) : query.eq(k, v);
  }
  if (q.from) query = query.gte('created_at', q.from);
  if (q.to) query = query.lte('created_at', `${q.to}T23:59:59.999Z`);
  const needle = q.q ? cleanSearch(q.q) : '';
  if (needle && r.search?.length) query = query.or(r.search.map((c) => `${c}.ilike.*${needle}*`).join(','));
  const { data, error, count } = await query.order(col, { ascending: asc, nullsFirst: false }).range((page - 1) * perPage, page * perPage - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as Row[], total: count ?? 0 };
}

/** Every matching row (for CSV export and reports). Capped at 10,000. */
export async function allRecords(r: Resource, q: ListQuery = {}): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 1; page <= 10; page++) {
    const { rows, total } = await listRecords(r, { ...q, page, perPage: 1000 });
    out.push(...rows);
    if (out.length >= total || rows.length === 0) break;
  }
  return out;
}

export async function getRecord(r: Resource, id: string): Promise<Row | null> {
  if (isDemo) {
    const row = table<Row>(r.table).find((x) => String(x[r.pk]) === id);
    return row && matchDemo(row, r, {}) ? row : null;
  }
  let q = db().from(r.table).select('*').eq(r.pk, id);
  for (const [k, v] of Object.entries(r.baseFilter ?? {})) q = q.eq(k, v);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row) ?? null;
}

export async function countRecords(tableName: string, filters: Record<string, string> = {}, since?: string, until?: string): Promise<number> {
  if (isDemo) {
    return table<Row>(tableName).filter((row) =>
      Object.entries(filters).every(([k, v]) => String(row[k]) === v) &&
      (!since || String(row.created_at ?? '') >= since) && (!until || String(row.created_at ?? '') < until)).length;
  }
  let q = db().from(tableName).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  if (since) q = q.gte('created_at', since);
  if (until) q = q.lt('created_at', until);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Rows created since a date (only the columns asked for). */
export async function rowsSince(tableName: string, since: string, cols = 'created_at'): Promise<Row[]> {
  if (isDemo) return table<Row>(tableName).filter((r) => String(r.created_at ?? '') >= since);
  const { data, error } = await db().from(tableName).select(cols).gte('created_at', since).limit(10000);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Row[];
}

async function slugTaken(r: Resource, col: string, slug: string, exceptId?: string) {
  if (isDemo) return table<Row>(r.table).some((x) => x[col] === slug && String(x[r.pk]) !== exceptId);
  let q = db().from(r.table).select(r.pk).eq(col, slug);
  if (exceptId) q = q.neq(r.pk, exceptId);
  const { data } = await q.limit(1);
  return !!data?.length;
}

/** Fills empty slug fields from their source field and makes them unique. */
export async function fillSlugs(r: Resource, values: Row, exceptId?: string) {
  for (const f of r.fields.filter((x) => x.type === 'slug')) {
    if (!(f.name in values)) continue;
    const base = slugify(String(values[f.name] || values[f.from ?? 'title'] || ''));
    if (!base) throw new Error(`Add a ${f.from ?? 'title'} with some letters or numbers`);
    let slug = base;
    for (let i = 2; await slugTaken(r, f.name, slug, exceptId); i++) slug = `${base}-${i}`;
    values[f.name] = slug;
  }
}

export async function createRecord(r: Resource, values: Row): Promise<Row> {
  const v = { ...values };
  for (const [k, val] of Object.entries(v)) if (val === null && k === r.pk) delete v[k];
  if (isDemo) {
    const row: Row = { ...v };
    if (!row[r.pk]) row[r.pk] = newId(r.table.slice(0, 2));
    if (hasCreated(r.table) && !row.created_at) row.created_at = new Date().toISOString();
    if (r.table === 'certificates' && !row.code) row.code = Math.random().toString(36).slice(2, 12).toUpperCase();
    if (r.table === 'support_tickets') { row.messages ??= []; row.updated_at = row.created_at; }
    const t = table<Row>(r.table);
    if (t.some((x) => String(x[r.pk]) === String(row[r.pk]))) throw new Error(`That ${r.singular} already exists`);
    t.unshift(row);
    return row;
  }
  if (r.table === 'certificates' && !v.code) delete v.code;
  const { data, error } = await db().from(r.table).insert(v).select('*').single();
  if (error) throw new Error(error.code === '23505' ? `That ${r.singular} already exists` : error.message);
  return data as Row;
}

export async function updateRecord(r: Resource, id: string, values: Row): Promise<Row> {
  if (isDemo) {
    const row = table<Row>(r.table).find((x) => String(x[r.pk]) === id);
    if (!row) throw new Error(`${r.singular} not found`);
    Object.assign(row, values);
    return row;
  }
  const { data, error } = await db().from(r.table).update(values).eq(r.pk, id).select('*').single();
  if (error) throw new Error(error.message);
  return data as Row;
}

export async function deleteRecord(r: Resource, id: string) {
  if (isDemo) {
    const t = table<Row>(r.table);
    const i = t.findIndex((x) => String(x[r.pk]) === id);
    if (i >= 0) t.splice(i, 1);
    return;
  }
  const { error } = await db().from(r.table).delete().eq(r.pk, id);
  if (error) throw new Error(error.code === '23503' ? `Can’t delete: other records still use this ${r.singular}. Unpublish it instead.` : error.message);
}

/* ----------------------------------------------------------------- relations */
function labelFor(target: Resource, row: Row) {
  if (target.table === 'profiles') return `${row.full_name || '(no name)'}${row.email ? ` · ${row.email}` : row.phone ? ` · ${row.phone}` : ''}`;
  return String(row[target.titleField] ?? row[target.pk]);
}

/** id → label maps for every relation used by these fields/columns. */
export async function relationOptions(keys: string[]): Promise<Record<string, Option[]>> {
  const out: Record<string, Option[]> = {};
  await Promise.all(Array.from(new Set(keys)).map(async (key) => {
    const target = RESOURCES[key];
    if (!target) return;
    const { rows } = await listRecords(target, { perPage: 1000, sort: target.titleField === 'full_name' ? undefined : undefined });
    out[key] = rows.map((row) => ({ value: String(row[target.pk]), label: labelFor(target, row) })).sort((a, b) => a.label.localeCompare(b.label));
  }));
  return out;
}

export function relationKeys(r: Resource) {
  const k: string[] = [];
  for (const f of r.fields) if (f.to) k.push(f.to);
  for (const c of r.columns) if (c.to) k.push(c.to);
  for (const f of r.filters ?? []) if (f.to) k.push(f.to);
  return k;
}

/* ----------------------------------------------------------------- activity log */
export async function logActivity(actor: { id: string; name: string }, action: string, entity: string, entityId: string | null, summary: string) {
  const row = { actor_id: isDemo ? null : actor.id, actor_name: actor.name, action, entity, entity_id: entityId, summary: summary.slice(0, 300) };
  try {
    if (isDemo) table<Row>('activity_log').unshift({ ...row, id: newId('ac'), created_at: new Date().toISOString() });
    else await db().from('activity_log').insert(row);
  } catch {
    /* never block the admin on logging */
  }
}
