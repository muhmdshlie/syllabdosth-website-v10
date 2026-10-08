import type { Metadata } from 'next';
import { deleteMediaAction, updateMediaAltAction } from '@/app/admin-actions';
import { ConfirmSubmit, CopyButton } from '@/components/admin/controls';
import { Icon } from '@/components/admin/icons';
import { MediaUploader } from '@/components/admin/media-uploader';
import { Empty, fmtDay, PageHeader } from '@/components/admin/ui';
import { listMedia } from '@/lib/media';

export const metadata: Metadata = { title: 'Media Library' };

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default async function MediaPage({ searchParams }: { searchParams: { q?: string } }) {
  const items = await listMedia(searchParams.q ?? '', 300);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return (
    <>
      <PageHeader title="Media Library" crumbs={[{ label: 'Media Library' }]} sub="Every image uploaded from the admin panel. Use “Copy link” to paste an image anywhere, or pick it from any image field." />
      <MediaUploader />
      <form method="get" className="my-6 flex gap-2" role="search">
        <input name="q" defaultValue={searchParams.q} className="adm-input max-w-sm" placeholder="Search by file name…" aria-label="Search media" />
        <button className="adm-btn-outline" type="submit">Search</button>
      </form>
      {items.length === 0 ? (
        <div className="adm-card"><Empty title={searchParams.q ? 'No files match' : 'No files yet'} text="Uploads from course, blog, CMS and settings forms also appear here." /></div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {items.map((m) => (
            <li key={m.id} className="adm-card flex flex-col overflow-hidden">
              <a href={m.url} target="_blank" rel="noreferrer" className="block aspect-square bg-[repeating-conic-gradient(#f1f5f4_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                {m.mime.startsWith('image/')
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.url} alt={m.alt || m.name} loading="lazy" className="h-full w-full object-contain" />
                  : <span className="flex h-full items-center justify-center text-adm-muted"><Icon name="download" size={32} /></span>}
              </a>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="truncate text-[13px] font-medium" title={m.name}>{m.name}</p>
                <p className="text-[12px] text-adm-muted">{size(m.size_bytes)} · {fmtDay(m.created_at)}</p>
                <form action={updateMediaAltAction} className="flex gap-1">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="alt" defaultValue={m.alt} placeholder="Description" className="adm-input !px-2 !py-1.5 !text-[12px]" aria-label={`Description for ${m.name}`} />
                  <button className="adm-btn-ghost !p-1.5" aria-label="Save description" title="Save description"><Icon name="check" size={16} /></button>
                </form>
                <div className="mt-auto flex items-center justify-between gap-1">
                  <CopyButton text={m.url.startsWith('/') ? `${site}${m.url}` : m.url} label="Copy link" />
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit label={`Delete ${m.name}`} confirm="Delete" />
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
