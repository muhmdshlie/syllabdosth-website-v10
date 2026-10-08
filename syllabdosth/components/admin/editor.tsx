'use client';
/**
 * One editor for every admin form: records (courses, lessons, …), CMS pages and settings.
 * Holds the values in state and posts them as JSON to a server action.
 */
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { listMediaAction, uploadMediaAction } from '@/app/admin-actions';
import type { ActionState } from '@/lib/action-state';
import type { Field, Option, Row } from '@/lib/admin/types';
import { isoToIstInput } from '@/lib/admin/validate';
import type { MediaItem } from '@/lib/types';
import { Icon } from './icons';

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function RecordEditor({ fields, initial, action, hidden, options = {}, creating = false, secretsSet = [], submitLabel = 'Save changes', extraButtons, folder = 'general', placeholders = {} }: {
  fields: Field[];
  initial: Row;
  action: Action;
  hidden: Record<string, string>;
  options?: Record<string, Option[]>;
  creating?: boolean;
  secretsSet?: string[];
  submitLabel?: string;
  extraButtons?: ReactNode;
  folder?: string;
  placeholders?: Record<string, string>;
}) {
  const start = useMemo(() => prepare(fields, initial, creating), [fields, initial, creating]);
  const [values, setValues] = useState<Row>(start);
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useFormState(action, {} as ActionState);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error || state.ok) top.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (state.ok) setDirty(false);
  }, [state]);
  const set = (name: string, v: unknown) => { setValues((o) => ({ ...o, [name]: v })); setDirty(true); };

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div ref={top} />
      {state.error && <p role="alert" className="rounded-xl border border-adm-red/30 bg-adm-red-soft px-4 py-3 text-[14px] font-medium text-[#b3321a]">{state.error}</p>}
      {state.ok && state.message && <p role="status" className="rounded-xl border border-adm-green/30 bg-adm-green-soft px-4 py-3 text-[14px] font-medium text-[#16784f]">{state.message}</p>}
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="payload" value={JSON.stringify(values)} />
      <FieldGrid fields={fields} values={values} set={set} options={options} creating={creating} secretsSet={secretsSet} path="" folder={folder} placeholders={placeholders} />
      <div className="sticky bottom-0 z-20 -mx-5 flex flex-wrap items-center gap-3 border-t border-adm-line bg-white/95 px-5 py-4 backdrop-blur">
        <Submit label={submitLabel} />
        {extraButtons}
        <span className="text-[13px] text-adm-muted" aria-live="polite">{dirty ? 'Unsaved changes' : ''}</span>
      </div>
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="adm-btn-primary min-w-[140px]" disabled={pending}>{pending ? 'Saving…' : <><Icon name="check" size={18} />{label}</>}</button>;
}

/** Fill defaults for new records; turn stored values into what the inputs expect. */
function prepare(fields: Field[], row: Row, creating: boolean): Row {
  const out: Row = {};
  for (const f of fields) {
    let v = row[f.name];
    if ((v === undefined || v === null) && creating && f.default !== undefined) v = f.default;
    if (f.type === 'datetime') v = isoToIstInput(v);
    if (f.type === 'date' && v) v = String(v).slice(0, 10);
    if (f.type === 'date' && !v && creating && f.required) v = new Date().toISOString().slice(0, 10);
    if (f.type === 'group') v = prepare(f.fields ?? [], (v ?? {}) as Row, creating);
    if (f.type === 'list') v = Array.isArray(v) ? v.map((item) => prepare(f.fields ?? [], (item ?? {}) as Row, false)) : [];
    if (f.type === 'bool') v = !!v;
    if (f.type === 'password') v = '';
    out[f.name] = v ?? (f.type === 'lines' || f.type === 'multiselect' || f.type === 'multirelation' ? [] : '');
  }
  return { ...row, ...out };
}

function FieldGrid({ fields, values, set, options, creating, secretsSet, path, folder, placeholders = {} }: { fields: Field[]; values: Row; set: (n: string, v: unknown) => void; options: Record<string, Option[]>; creating: boolean; secretsSet: string[]; path: string; folder: string; placeholders?: Record<string, string> }) {
  return (
    <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
      {fields.map((f) => {
        if (f.showIf && !f.showIf.equals.includes(String(values[f.showIf.field] ?? ''))) return null;
        if (f.createOnly && !creating && f.type !== 'slug' && f.type !== 'text' && f.type !== 'email' && f.type !== 'bool') return null;
        const id = `f-${path}${f.name}`.replace(/[^\w-]/g, '-');
        const full = f.full || f.type === 'group' || f.type === 'list' || f.type === 'image' || f.type === 'textarea' || f.type === 'lines' || f.type === 'multirelation' || f.type === 'multiselect';
        return (
          <div key={f.name} className={full ? 'md:col-span-2' : ''}>
            <Control f={f} id={id} value={values[f.name]} onChange={(v) => set(f.name, v)} options={options} creating={creating} secret={secretsSet.includes(`${path}${f.name}`)} path={`${path}${f.name}.`} folder={folder} secretsSet={secretsSet} placeholder={placeholders[f.name]} />
          </div>
        );
      })}
    </div>
  );
}

function Label({ f, id }: { f: Field; id: string }) {
  return (
    <label htmlFor={id} className="adm-label">
      {f.label}{f.required && !f.readonly && <span className="text-adm-red"> *</span>}
    </label>
  );
}

function Control({ f, id, value, onChange, options, creating, secret, path, folder, secretsSet, placeholder }: { f: Field; id: string; value: unknown; onChange: (v: unknown) => void; options: Record<string, Option[]>; creating: boolean; secret: boolean; path: string; folder: string; secretsSet: string[]; placeholder?: string }) {
  const locked = f.readonly || (f.createOnly && !creating);
  const str = value === null || value === undefined ? '' : String(value);
  const help = f.help && <p className="adm-help">{f.help}</p>;

  if (f.type === 'group') {
    return (
      <fieldset className="rounded-xl border border-adm-line p-4 sm:p-5">
        <legend className="px-2 text-[14px] font-semibold">{f.label}</legend>
        {help}
        <div className="mt-2"><FieldGrid fields={f.fields ?? []} values={(value ?? {}) as Row} set={(n, v) => onChange({ ...((value ?? {}) as Row), [n]: v })} options={options} creating={creating} secretsSet={secretsSet} path={path} folder={folder} /></div>
      </fieldset>
    );
  }
  if (f.type === 'list') return <ListControl f={f} value={(value as Row[]) ?? []} onChange={onChange} options={options} folder={folder} />;
  if (f.type === 'bool') {
    return (
      <label className={`flex items-start gap-3 ${locked ? 'opacity-60' : 'cursor-pointer'}`}>
        <span className="relative mt-0.5 inline-flex">
          <input id={id} type="checkbox" className="peer sr-only" checked={!!value} disabled={locked} onChange={(e) => onChange(e.target.checked)} />
          <span className="h-6 w-11 rounded-full bg-[#D5DCE1] transition peer-checked:bg-adm-green peer-focus-visible:ring-2 peer-focus-visible:ring-adm-green/40" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
        <span><span className="text-[14px] font-medium">{f.label}</span>{help}</span>
      </label>
    );
  }
  if (f.type === 'image') return <div><Label f={f} id={id} /><ImageControl id={id} value={str} onChange={onChange} folder={folder} disabled={locked} fallback={placeholder} />{help}</div>;
  if (f.type === 'multirelation' || f.type === 'multiselect') {
    const opts = f.type === 'multiselect' ? f.options ?? [] : options[f.to ?? ''] ?? [];
    return <div><p className="adm-label">{f.label}</p><MultiControl opts={opts} value={(value as string[]) ?? []} onChange={onChange} />{help}</div>;
  }

  let input: ReactNode;
  const common = { id, name: undefined, disabled: locked, className: 'adm-input', placeholder: f.placeholder };
  switch (f.type) {
    case 'textarea':
      input = <textarea {...common} rows={f.rows ?? 4} value={str} maxLength={f.max} onChange={(e) => onChange(e.target.value)} className="adm-input resize-y leading-relaxed" />;
      break;
    case 'lines':
      input = <textarea {...common} rows={f.rows ?? Math.min(10, Math.max(3, (Array.isArray(value) ? value.length : 3) + 1))} value={Array.isArray(value) ? value.join('\n') : str} onChange={(e) => onChange(e.target.value)} className="adm-input resize-y leading-relaxed" />;
      break;
    case 'select':
      input = (
        <select {...common} value={str} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">—</option>}
          {f.required && !str && <option value="" disabled>Choose…</option>}
          {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'relation': {
      const opts = options[f.to ?? ''] ?? [];
      input = (
        <select {...common} value={str} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{f.required ? 'Choose…' : '— None —'}</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {str && !opts.some((o) => o.value === str) && <option value={str}>{str}</option>}
        </select>
      );
      break;
    }
    case 'number':
      input = <input {...common} type="number" inputMode="decimal" value={str} min={f.min} max={f.max} step={f.int ? 1 : 'any'} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'date':
      input = <input {...common} type="date" value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'datetime':
      input = <input {...common} type="datetime-local" value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'password':
      input = <input {...common} type="password" autoComplete="new-password" value={str} placeholder={secret ? 'Saved — leave blank to keep it' : f.placeholder} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'color':
      input = (
        <div className="flex gap-2">
          <input type="color" aria-label={`${f.label} picker`} value={/^#[0-9a-f]{6}$/i.test(str) ? str : '#000000'} disabled={locked} onChange={(e) => onChange(e.target.value)} className="h-[42px] w-14 cursor-pointer rounded-[10px] border border-adm-line bg-white p-1" />
          <input {...common} value={str} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
      break;
    default:
      input = <input {...common} type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'} value={str} maxLength={f.max} placeholder={f.type === 'slug' && !str ? 'Created automatically' : f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return <div><Label f={f} id={id} />{input}{help}</div>;
}

function MultiControl({ opts, value, onChange }: { opts: Option[]; value: string[]; onChange: (v: unknown) => void }) {
  const [q, setQ] = useState('');
  const shown = opts.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-[10px] border border-adm-line">
      {opts.length > 8 && <input className="w-full border-b border-adm-line px-3.5 py-2 text-[14px] focus:outline-none" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="grid max-h-56 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
        {shown.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[14px] hover:bg-adm-bg">
            <input type="checkbox" className="h-4 w-4 accent-[#27AE7A]" checked={value.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))} />
            {o.label}
          </label>
        ))}
        {!shown.length && <p className="px-2 py-1.5 text-[13px] text-adm-muted">Nothing to choose yet.</p>}
      </div>
    </div>
  );
}

function ListControl({ f, value, onChange, options, folder }: { f: Field; value: Row[]; onChange: (v: unknown) => void; options: Record<string, Option[]>; folder: string }) {
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null);
  const blank = () => prepare(f.fields ?? [], {}, true);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen(j);
  };
  const noun = f.itemLabel ?? 'item';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="adm-label !mb-0">{f.label} <span className="font-normal text-adm-muted">({value.length})</span></p>
        <button type="button" className="adm-btn-outline adm-btn-sm" onClick={() => { onChange([...value, blank()]); setOpen(value.length); }}><Icon name="plus" size={16} />Add {noun}</button>
      </div>
      {f.help && <p className="adm-help -mt-1 mb-2">{f.help}</p>}
      <ol className="space-y-2">
        {value.map((item, i) => {
          const title = String(item[f.titleKey ?? ''] ?? '').trim() || `${noun[0].toUpperCase()}${noun.slice(1)} ${i + 1}`;
          const thumb = (f.fields ?? []).find((x) => x.type === 'image');
          const src = thumb ? String(item[thumb.name] ?? '') : '';
          return (
            <li key={i} className="rounded-xl border border-adm-line bg-[#FBFDFC]">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-adm-bg text-[12px] font-semibold text-adm-muted">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {src && <img src={src} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />}
                  <span className="truncate text-[14px] font-medium">{title}</span>
                  <Icon name="chevron" size={16} className={`ml-auto shrink-0 text-adm-muted transition ${open === i ? 'rotate-180' : ''}`} />
                </button>
                <button type="button" className="adm-btn-ghost !p-1.5" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><Icon name="arrowUp" size={16} /></button>
                <button type="button" className="adm-btn-ghost !p-1.5" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Move down"><Icon name="arrowDown" size={16} /></button>
                <button type="button" className="adm-btn-ghost !p-1.5" onClick={() => { onChange([...value.slice(0, i + 1), JSON.parse(JSON.stringify(item)), ...value.slice(i + 1)]); setOpen(i + 1); }} aria-label="Duplicate"><Icon name="copy" size={16} /></button>
                <button type="button" className="adm-btn-ghost !p-1.5 hover:!text-adm-red" onClick={() => { onChange(value.filter((_, j) => j !== i)); setOpen(null); }} aria-label={`Remove ${noun} ${i + 1}`}><Icon name="trash" size={16} /></button>
              </div>
              {open === i && (
                <div className="border-t border-adm-line p-4">
                  <FieldGrid fields={f.fields ?? []} values={item} set={(n, v) => onChange(value.map((x, j) => (j === i ? { ...x, [n]: v } : x)))} options={options} creating secretsSet={[]} path={`${f.name}.${i}.`} folder={folder} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {!value.length && <p className="rounded-xl border border-dashed border-adm-line px-4 py-5 text-center text-[14px] text-adm-muted">No {noun}s yet.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ images */
export function ImageControl({ id, value, onChange, folder = 'general', disabled, fallback }: { id: string; value: string; onChange: (v: string) => void; folder?: string; disabled?: boolean; fallback?: string }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState('');
  const [picker, setPicker] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const upload = (f: File) => start(async () => {
    setErr('');
    const fd = new FormData();
    fd.append('file', f);
    fd.append('folder', folder);
    const res = await uploadMediaAction(fd);
    if (res.error) setErr(res.error);
    else if (res.item) onChange(res.item.url);
  });
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-adm-line bg-[repeating-conic-gradient(#f1f5f4_0_25%,#fff_0_50%)] bg-[length:16px_16px] sm:w-44"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && !disabled) upload(f); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : fallback ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fallback} alt="" className="h-full w-full object-cover opacity-60" />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[11px] font-medium text-white">Default photo in use</span>
          </>
        ) : <span className="flex flex-col items-center gap-1 text-[12px] text-adm-muted"><Icon name="image" />Drop an image</span>}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-[13px] font-medium">Uploading…</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input id={id} className="adm-input" value={value} disabled={disabled} placeholder="https://… or upload" onChange={(e) => onChange(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          <button type="button" className="adm-btn-outline adm-btn-sm" disabled={busy || disabled} onClick={() => file.current?.click()}><Icon name="upload" size={16} />Upload</button>
          <button type="button" className="adm-btn-outline adm-btn-sm" disabled={disabled} onClick={() => setPicker(true)}><Icon name="media" size={16} />Media library</button>
          {value && <button type="button" className="adm-btn-ghost adm-btn-sm" disabled={disabled} onClick={() => onChange('')}><Icon name="x" size={16} />Remove</button>}
        </div>
        {err && <p role="alert" className="text-[13px] font-medium text-adm-red">{err}</p>}
      </div>
      {picker && <MediaPicker onPick={(u) => { onChange(u); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

function MediaPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { listMediaAction(q).then((r) => { if (live) setItems(r); }).catch(() => live && setItems([])); }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal aria-label="Media library" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-adm-line p-4">
          <h2 className="text-[17px] font-semibold">Media library</h2>
          <input className="adm-input ml-auto max-w-xs" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button type="button" className="adm-btn-ghost !p-2" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-5">
          {items === null && <p className="col-span-full py-10 text-center text-adm-muted">Loading…</p>}
          {items?.length === 0 && <p className="col-span-full py-10 text-center text-adm-muted">No files yet. Use “Upload” to add one.</p>}
          {items?.filter((m) => m.mime.startsWith('image/')).map((m) => (
            <button type="button" key={m.id} onClick={() => onPick(m.url)} className="group overflow-hidden rounded-xl border border-adm-line text-left hover:border-adm-green">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt} className="aspect-square w-full bg-adm-bg object-cover" />
              <span className="block truncate px-2 py-1.5 text-[12px] text-adm-muted group-hover:text-adm-green">{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
