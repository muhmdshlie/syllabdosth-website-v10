import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveRecordAction } from '@/app/admin-actions';
import { RecordEditor } from '@/components/admin/editor';
import { Card, PageHeader } from '@/components/admin/ui';
import { relationKeys, relationOptions } from '@/lib/admin/crud';
import { getResource } from '@/lib/admin/resources';
import type { Row } from '@/lib/admin/types';

export async function generateMetadata({ params }: { params: { resource: string } }): Promise<Metadata> {
  const r = getResource(params.resource);
  return { title: r ? `Add ${r.singular}` : 'Admin' };
}

export default async function NewRecord({ params, searchParams }: { params: { resource: string }; searchParams: Record<string, string | undefined> }) {
  const r = getResource(params.resource);
  if (!r || r.noCreate) notFound();
  const options = await relationOptions(relationKeys(r));
  // Pre-fill from the URL, e.g. /admin/lessons/new?course_id=c-13
  const initial: Row = {};
  for (const f of r.fields) if (searchParams[f.name]) initial[f.name] = searchParams[f.name];
  const title = `Add ${r.singular}`;
  return (
    <>
      <PageHeader title={title[0].toUpperCase() + title.slice(1)} crumbs={[{ href: `/admin/${r.key}`, label: r.label }, { label: 'Add new' }]} sub={r.description}
        actions={<Link href={`/admin/${r.key}`} className="adm-btn-outline">Cancel</Link>} />
      <Card>
        <RecordEditor fields={r.fields} initial={initial} creating action={saveRecordAction} hidden={{ resource: r.key }} options={options} submitLabel={`Add ${r.singular}`} folder={r.key} />
      </Card>
    </>
  );
}
