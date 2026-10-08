import type { ReactNode } from 'react';
import type { Column, Option, Resource, Row } from '@/lib/admin/types';
import { inr } from '@/lib/format';
import { QuickSelect, QuickToggle } from './controls';
import { fmtDateTime, fmtDay, StatusBadge } from './ui';

/** Renders one table cell; status and on/off columns become inline editors. */
export function Cell({ col, row, r, options, fallback }: { col: Column; row: Row; r: Resource; options: Record<string, Option[]>; fallback?: string }): ReactNode {
  const v = row[col.name];
  const id = String(row[r.pk]);
  const field = r.fields.find((f) => f.name === col.name);
  const editable = field && !field.readonly && !r.noEdit;
  switch (col.kind) {
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element
      if (!v && fallback) return <img src={fallback} alt="" title="Default photo (no image uploaded)" className="h-10 w-10 rounded-lg object-cover opacity-60 grayscale-[30%]" loading="lazy" />;
      // eslint-disable-next-line @next/next/no-img-element
      return v ? <img src={String(v)} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-adm-bg text-[11px] text-adm-muted">—</span>;
    case 'strong':
      return <span className="font-medium text-adm-text">{String(v ?? '—')}</span>;
    case 'bool':
      if (editable && field.type === 'bool') return <QuickToggle resource={r.key} id={id} field={col.name} value={!!v} label={`${col.label} for ${String(row[r.titleField] ?? id)}`} />;
      return v ? <StatusBadge value="Yes" tone="green" /> : <span className="text-adm-muted">—</span>;
    case 'status':
    case 'role':
      if (editable && field.type === 'select' && field.options) {
        return <QuickSelect resource={r.key} id={id} field={col.name} value={String(v ?? '')} options={field.options} label={`${col.label} for ${String(row[r.titleField] ?? id)}`} />;
      }
      return v ? <StatusBadge value={String(v)} /> : <span className="text-adm-muted">—</span>;
    case 'date':
      return <span className="whitespace-nowrap text-adm-muted">{fmtDay(v)}</span>;
    case 'datetime':
      return <span className="whitespace-nowrap text-adm-muted">{fmtDateTime(v)}</span>;
    case 'money':
      return <span className="whitespace-nowrap">{typeof v === 'number' ? inr(v) : '—'}</span>;
    case 'count':
      return Array.isArray(v) ? v.length : typeof v === 'number' ? v.toLocaleString('en-IN') : '—';
    case 'stars':
      return <span className="whitespace-nowrap text-adm-orange" aria-label={`${v} out of 5`}>{'★'.repeat(Number(v) || 0)}<span className="text-[#E5E7EB]">{'★'.repeat(5 - (Number(v) || 0))}</span></span>;
    case 'relation': {
      if (!v) return <span className="text-adm-muted">—</span>;
      const label = options[col.to ?? '']?.find((o) => o.value === String(v))?.label;
      return <span>{label ?? String(v)}</span>;
    }
    default: {
      const s = v === null || v === undefined || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v);
      return <span className={`line-clamp-2 max-w-[340px] ${s === '—' ? 'text-adm-muted' : ''}`}>{s}</span>;
    }
  }
}
