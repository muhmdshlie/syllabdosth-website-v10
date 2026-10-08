/** Turns what the admin form sent into clean database values, field by field. Server and client safe. */
import type { Field, Row } from './types';

export const slugify = (t: string) =>
  t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class FieldError extends Error {}

/** "2026-10-02T18:00" typed in IST → ISO timestamp. Already-ISO values pass through. */
export function istToIso(v: string): string {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(v)) return new Date(v).toISOString();
  const [d, t = '00:00'] = v.split('T');
  const iso = new Date(`${d}T${t.slice(0, 5)}:00+05:30`);
  if (Number.isNaN(iso.getTime())) throw new FieldError('bad date');
  return iso.toISOString();
}
/** ISO timestamp → "YYYY-MM-DDTHH:MM" in IST, for <input type="datetime-local">. */
export function isoToIstInput(v: unknown): string {
  if (!v) return '';
  const t = new Date(String(v));
  if (Number.isNaN(t.getTime())) return '';
  return new Date(t.getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

export function isEmpty(v: unknown) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}

function coerceOne(f: Field, raw: unknown, path: string): unknown {
  const label = path || f.label;
  const need = (ok: boolean, msg: string) => { if (!ok) throw new FieldError(msg); };
  if (isEmpty(raw) && f.type !== 'bool' && f.type !== 'number') {
    need(!f.required, `${label} is required`);
    if (f.type === 'lines' || f.type === 'multiselect' || f.type === 'multirelation' || f.type === 'list') return [];
    if (f.type === 'group') return {};
    if (['text', 'textarea', 'password', 'slug', 'color'].includes(f.type)) return '';
    return null;
  }
  switch (f.type) {
    case 'text': case 'textarea': case 'password': case 'color': case 'slug': {
      const s = String(raw).trim();
      if (f.max) need(s.length <= f.max, `${label}: keep it under ${f.max} characters`);
      return f.type === 'slug' ? slugify(s) : s;
    }
    case 'email': {
      const s = String(raw).trim().toLowerCase();
      need(EMAIL.test(s), `${label}: enter a valid email address`);
      return s;
    }
    case 'url': case 'image': {
      const s = String(raw).trim();
      need(/^(https?:\/\/|\/|data:image\/)/.test(s), `${label}: enter a full link starting with https://`);
      return s;
    }
    case 'number': {
      if (isEmpty(raw)) { need(!f.required, `${label} is required`); return f.default ?? (f.required ? 0 : null); }
      const n = Number(raw);
      need(Number.isFinite(n), `${label} must be a number`);
      if (f.int) need(Number.isInteger(n), `${label} must be a whole number`);
      if (f.min !== undefined) need(n >= f.min, `${label} must be at least ${f.min}`);
      if (f.max !== undefined) need(n <= f.max, `${label} must be ${f.max} or less`);
      return n;
    }
    case 'bool':
      return raw === true || raw === 'true' || raw === 'on' || raw === 1;
    case 'select': {
      const s = String(raw);
      need(!f.options || f.options.some((o) => o.value === s), `${label}: choose one of the options`);
      return s;
    }
    case 'relation':
      return String(raw);
    case 'multiselect': case 'multirelation': {
      const arr = (Array.isArray(raw) ? raw : [raw]).map(String).filter(Boolean);
      if (f.type === 'multiselect' && f.options) need(arr.every((v) => f.options!.some((o) => o.value === v)), `${label}: choose from the options`);
      return Array.from(new Set(arr));
    }
    case 'lines': {
      const arr = (Array.isArray(raw) ? raw : String(raw).split('\n')).map((l) => String(l).trim()).filter(Boolean);
      need(!f.required || arr.length > 0, `${label} is required`);
      return arr;
    }
    case 'date': {
      const s = String(raw).slice(0, 10);
      need(DATE.test(s), `${label}: choose a date`);
      return s;
    }
    case 'datetime':
      try { return istToIso(String(raw)); } catch { throw new FieldError(`${label}: choose a date and time`); }
    case 'list': {
      need(Array.isArray(raw), `${label}: invalid list`);
      return (raw as unknown[]).map((item, i) => coerceObject(f.fields ?? [], (item ?? {}) as Row, `${label} ${i + 1} → `));
    }
    case 'group':
      return coerceObject(f.fields ?? [], (raw ?? {}) as Row, `${label} → `);
    default:
      return raw;
  }
}

function coerceObject(fields: Field[], raw: Row, prefix: string): Row {
  const out: Row = {};
  for (const f of fields) {
    if (f.readonly) continue;
    out[f.name] = coerceOne(f, raw[f.name], `${prefix}${f.label}`);
  }
  // quiz questions: the correct option must exist
  if ('options' in out && 'correct' in out && Array.isArray(out.options)) {
    const n = (out.options as unknown[]).length;
    if (typeof out.correct === 'number' && (out.correct < 1 || out.correct > n)) throw new FieldError(`${prefix}Correct option must be between 1 and ${n}`);
  }
  return out;
}

/** Validates a whole form. Returns clean values or the first error message. */
export function coerceValues(fields: Field[], raw: Row, opts: { creating: boolean }): { values?: Row; error?: string } {
  try {
    const values: Row = {};
    for (const f of fields) {
      if (f.readonly) continue;
      if (f.createOnly && !opts.creating) continue;
      if (f.type === 'slug' && isEmpty(raw[f.name])) { values[f.name] = ''; continue; } // filled in by the server
      values[f.name] = coerceOne(f, raw[f.name], '');
    }
    return { values };
  } catch (e) {
    return { error: e instanceof FieldError ? e.message : 'Please check the form' };
  }
}
