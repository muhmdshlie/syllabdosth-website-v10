import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { resetContentAction, saveContentAction } from '@/app/admin-actions';
import { getContent, getSavedContent, withoutSecrets } from '@/lib/cms/content';
import { CONTENT } from '@/lib/cms/schema';
import { RecordEditor } from './editor';
import { Icon } from './icons';
import { Card, Flash, PageHeader } from './ui';

/** Editor page for one CMS page or settings group. */
export async function ContentPage({ contentKey, crumbs, back, children, reset }: { contentKey: string; crumbs: { href?: string; label: string }[]; back: string; children?: ReactNode; reset?: boolean }) {
  const def = CONTENT[contentKey];
  if (!def) notFound();
  const [value, saved] = await Promise.all([getContent(contentKey), getSavedContent(contentKey)]);
  const { value: safe, secretsSet } = withoutSecrets(contentKey, value);
  return (
    <>
      <PageHeader
        title={def.title}
        crumbs={crumbs}
        sub={def.description}
        actions={<>
          {def.viewPath && <a href={def.viewPath} target="_blank" rel="noreferrer" className="adm-btn-outline"><Icon name="eye" size={18} />View page</a>}
          {saved && (
            <form action={resetContentAction}>
              <input type="hidden" name="key" value={contentKey} />
              <input type="hidden" name="back" value={back} />
              <button type="submit" className="adm-btn-ghost" title="Go back to the original content">Reset to original</button>
            </form>
          )}
        </>}
      />
      {reset && <Flash>Reset to the original content.</Flash>}
      {!saved && def.kind === 'page' && <Flash tone="orange">This page shows its original content. Change anything below and press Save.</Flash>}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card><RecordEditor fields={def.fields} initial={safe} action={saveContentAction} hidden={{ key: contentKey }} secretsSet={secretsSet} folder={def.kind === 'page' ? 'cms' : 'settings'} /></Card>
        <aside className="space-y-6">{children ?? <HelpCard kind={def.kind} />}</aside>
      </div>
    </>
  );
}

function HelpCard({ kind }: { kind: 'page' | 'settings' }) {
  return (
    <Card title="Tips">
      <ul className="list-disc space-y-2 pl-5 text-[14px] text-adm-muted">
        {kind === 'page' ? <>
          <li>Changes go live on the website as soon as you press <b>Save</b>.</li>
          <li>Images: press <b>Upload</b> or drag a photo onto the box. JPG or WebP under 1&nbsp;MB loads fastest.</li>
          <li>Lists (photos, slides, questions) can be reordered with the arrows.</li>
          <li><b>Reset to original</b> brings back the first version of this page.</li>
        </> : <>
          <li>Settings apply to the whole website as soon as you save.</li>
          <li>Passwords and keys are never shown again after saving. Leave them blank to keep them.</li>
        </>}
      </ul>
      <p className="mt-4 text-[14px]"><Link href="/admin/media" className="font-medium text-adm-green hover:underline">Open the media library →</Link></p>
    </Card>
  );
}
