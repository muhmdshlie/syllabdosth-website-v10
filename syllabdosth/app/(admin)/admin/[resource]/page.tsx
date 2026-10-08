import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cell } from '@/components/admin/cells';
import { AutoSubmitSelect, DeleteButton } from '@/components/admin/controls';
import { Icon } from '@/components/admin/icons';
import { Empty, Flash, PageHeader, Pagination } from '@/components/admin/ui';
import { listRecords, relationKeys, relationOptions } from '@/lib/admin/crud';
import { imageFallbacks } from '@/lib/admin/fallbacks';
import { getResource, groupTabs } from '@/lib/admin/resources';

type SP = Record<string, string | undefined>;

export async function generateMetadata({ params }: { params: { resource: string } }): Promise<Metadata> {
  return { title: getResource(params.resource)?.label ?? 'Admin' };
}

export default async function ResourceList({ params, searchParams }: { params: { resource: string }; searchParams: SP }) {
  const r = getResource(params.resource);
  if (!r) notFound();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const filters = Object.fromEntries((r.filters ?? []).map((f) => [f.name, searchParams[f.name] ?? '']));
  const q = searchParams.q ?? '';
  const [{ rows, total }, options] = await Promise.all([
    listRecords(r, { q, filters, page, sort: searchParams.sort, dir: searchParams.dir === 'asc' ? 'asc' : 'desc' }),
    relationOptions(relationKeys(r)),
  ]);
  const fallbacks = await imageFallbacks(r, rows);
  const perPage = r.perPage ?? 20;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const qs = (patch: SP) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return `/admin/${r.key}${s ? `?${s}` : ''}`;
  };
  const exportQs = new URLSearchParams(Object.entries({ q, ...filters }).filter(([, v]) => v) as [string, string][]).toString();
  const tabs = groupTabs(r.group);
  const filtered = !!q || Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title={r.label}
        crumbs={[{ label: r.label }]}
        sub={r.description}
        actions={<>
          <a href={`/admin/export/${r.key}${exportQs ? `?${exportQs}` : ''}`} className="adm-btn-outline"><Icon name="download" size={18} />Export CSV</a>
          {!r.noCreate && <Link href={`/admin/${r.key}/new`} className="adm-btn-primary"><Icon name="plus" size={18} />Add {r.singular}</Link>}
        </>}
      />
      {searchParams.deleted && <Flash>Deleted.</Flash>}
      {searchParams.error && <Flash tone="red">{searchParams.error}</Flash>}

      {tabs.length > 1 && (
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-adm-line bg-white p-1" aria-label="Sections">
          {tabs.map((t) => (
            <Link key={t.key} href={`/admin/${t.key}`} aria-current={t.key === r.key ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-4 py-2 text-[14px] font-medium ${t.key === r.key ? 'bg-adm-green text-white' : 'text-adm-muted hover:bg-adm-bg hover:text-adm-text'}`}>{t.label}</Link>
          ))}
        </nav>
      )}

      <div className="adm-card overflow-hidden">
        <form method="get" className="flex flex-wrap items-center gap-2 border-b border-adm-line p-4" role="search">
          {r.search?.length ? (
            <div className="relative min-w-[220px] flex-1">
              <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-adm-muted" />
              <input name="q" defaultValue={q} placeholder={`Search ${r.label.toLowerCase()}…`} className="adm-input !pl-10" aria-label={`Search ${r.label}`} />
            </div>
          ) : <div className="flex-1" />}
          {(r.filters ?? []).map((f) => <AutoSubmitSelect key={f.name} name={f.name} value={filters[f.name]} label={f.label} options={f.options ?? options[f.to ?? ''] ?? []} />)}
          {r.search?.length ? <button className="adm-btn-outline" type="submit">Search</button> : null}
          {filtered && <Link href={`/admin/${r.key}`} className="adm-btn-ghost">Clear</Link>}
        </form>

        {rows.length === 0 ? (
          <Empty
            title={filtered ? 'Nothing matches' : `No ${r.label.toLowerCase()} yet`}
            text={filtered ? 'Try a different search or clear the filters.' : r.noCreate ? r.createHint : undefined}
            action={!filtered && !r.noCreate ? <Link href={`/admin/${r.key}/new`} className="adm-btn-primary"><Icon name="plus" size={18} />Add {r.singular}</Link> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FBFA]">
                <tr className="border-b border-adm-line">
                  {r.columns.map((c) => <th key={c.name} className="adm-th">{c.label}</th>)}
                  <th className="adm-th text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = String(row[r.pk]);
                  const href = `/admin/${r.key}/${encodeURIComponent(id)}`;
                  const view = r.viewPath?.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(row[k] ?? '')));
                  return (
                    <tr key={id} className="border-b border-adm-line last:border-0 hover:bg-[#FAFDFC]">
                      {r.columns.map((c, i) => (
                        <td key={c.name} className="adm-td">
                          {i === 0 || (i === 1 && r.columns[0].kind === 'image') ? (
                            <Link href={href} className="hover:text-adm-green">{Cell({ col: c, row, r, options, fallback: fallbacks[id] })}</Link>
                          ) : Cell({ col: c, row, r, options, fallback: fallbacks[id] })}
                        </td>
                      ))}
                      <td className="adm-td">
                        <div className="flex items-center justify-end gap-0.5">
                          {view && <a href={view} target="_blank" rel="noreferrer" className="adm-btn-ghost !p-2" title="View on website" aria-label="View on website"><Icon name="eye" size={18} /></a>}
                          {!r.noEdit && <Link href={href} className="adm-btn-ghost !p-2" title="Edit" aria-label={`Edit ${String(row[r.titleField] ?? id)}`}><Icon name="edit" size={18} /></Link>}
                          {r.noEdit && r.key !== 'activity' && <Link href={href} className="adm-btn-ghost !p-2" title="Open" aria-label="Open"><Icon name="eye" size={18} /></Link>}
                          {!r.noDelete && <DeleteButton resource={r.key} id={id} name={String(row[r.titleField] ?? id)} compact />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-adm-line px-4 py-3 text-[13px] text-adm-muted">
          <span>{total === 0 ? 'No results' : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total.toLocaleString('en-IN')}`}</span>
          <Pagination page={page} pages={pages} href={(p) => qs({ page: String(p) })} />
        </div>
      </div>
    </>
  );
}
