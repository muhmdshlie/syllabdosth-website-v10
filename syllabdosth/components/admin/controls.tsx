'use client';
/** Small interactive pieces used on server-rendered admin pages. */
import { useRef, useState, useTransition } from 'react';
import { deleteRecordAction, quickSetAction } from '@/app/admin-actions';
import type { Option } from '@/lib/admin/types';
import { Icon } from './icons';

/** Delete with an inline "Are you sure?" step (no browser pop-up). */
export function DeleteButton({ resource, id, name, back, compact }: { resource: string; id: string; name: string; back?: 'edit' | 'list'; compact?: boolean }) {
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  if (!ask) {
    return compact ? (
      <button type="button" className="adm-btn-ghost !p-2 hover:!bg-adm-red-soft hover:!text-adm-red" onClick={() => setAsk(true)} aria-label={`Delete ${name}`} title="Delete"><Icon name="trash" size={18} /></button>
    ) : (
      <button type="button" className="adm-btn-outline hover:!border-adm-red hover:!text-adm-red" onClick={() => setAsk(true)}><Icon name="trash" size={18} />Delete</button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-adm-red-soft px-2 py-1">
      <span className="text-[13px] font-medium text-[#b3321a]">Delete?</span>
      <button
        type="button"
        className="adm-btn-danger adm-btn-sm"
        disabled={pending}
        onClick={() => start(async () => {
          const fd = new FormData();
          fd.set('resource', resource); fd.set('id', id); fd.set('back', back ?? 'list');
          await deleteRecordAction(fd);
          setAsk(false);
        })}
      >{pending ? '…' : 'Yes, delete'}</button>
      <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setAsk(false)}>No</button>
    </span>
  );
}

/** Status dropdown that saves as soon as it changes. */
export function QuickSelect({ resource, id, field, value, options, label }: { resource: string; id: string; field: string; value: string; options: Option[]; label: string }) {
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={label}
      value={v}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        start(async () => { const fd = new FormData(); fd.set('resource', resource); fd.set('id', id); fd.set('field', field); fd.set('value', next); await quickSetAction(fd); });
      }}
      className={`rounded-lg border border-adm-line bg-white py-1.5 pl-2.5 pr-7 text-[13px] font-medium focus:border-adm-green focus:outline-none ${pending ? 'opacity-60' : ''}`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** On/off switch that saves immediately. */
export function QuickToggle({ resource, id, field, value, label }: { resource: string; id: string; field: string; value: boolean; label: string }) {
  const [on, setOn] = useState(value);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={pending}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => { const fd = new FormData(); fd.set('resource', resource); fd.set('id', id); fd.set('field', field); fd.set('value', String(next)); await quickSetAction(fd); });
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-adm-green' : 'bg-[#D5DCE1]'} ${pending ? 'opacity-60' : ''}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="adm-btn-outline adm-btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}>
      <Icon name={done ? 'check' : 'copy'} size={16} />{done ? 'Copied' : label}
    </button>
  );
}

/** Filter dropdowns that apply on change. */
export function AutoSubmitSelect({ name, value, options, label }: { name: string; value: string; options: Option[]; label: string }) {
  const ref = useRef<HTMLSelectElement>(null);
  return (
    <select ref={ref} name={name} defaultValue={value} aria-label={label} onChange={() => ref.current?.form?.requestSubmit()} className="adm-input !w-auto min-w-[150px] !py-2">
      <option value="">{label}: all</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Submit button that asks once before submitting its form. */
export function ConfirmSubmit({ label, confirm = 'Sure?', icon = 'trash', danger = true }: { label: string; confirm?: string; icon?: string; danger?: boolean }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" onClick={() => setAsk(true)} className={`adm-btn-ghost !p-2 ${danger ? 'hover:!bg-adm-red-soft hover:!text-adm-red' : ''}`} aria-label={label} title={label}><Icon name={icon} size={16} /></button>;
  return (
    <span className="inline-flex items-center gap-1">
      <button type="submit" className="adm-btn-danger adm-btn-sm">{confirm}</button>
      <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setAsk(false)}>No</button>
    </span>
  );
}

/** Button that runs a server action and shows "done". */
export function RunButton({ action, label, doneLabel, icon = 'check' }: { action: () => Promise<void>; label: string; doneLabel: string; icon?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="adm-btn-primary" disabled={pending} onClick={() => start(async () => { await action(); setDone(true); setTimeout(() => setDone(false), 3000); })}>
      <Icon name={done ? 'check' : icon} size={18} />{pending ? 'Working…' : done ? doneLabel : label}
    </button>
  );
}
