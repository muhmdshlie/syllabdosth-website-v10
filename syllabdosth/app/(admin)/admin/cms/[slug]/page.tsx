import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/components/admin/content-page';
import { Card } from '@/components/admin/ui';
import { CONTENT, contentKeyFromSlug } from '@/lib/cms/schema';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: CONTENT[contentKeyFromSlug('page', params.slug)]?.title ?? 'CMS' };
}

export default function CmsPage({ params, searchParams }: { params: { slug: string }; searchParams: { reset?: string } }) {
  const key = contentKeyFromSlug('page', params.slug);
  if (!CONTENT[key] || CONTENT[key].kind !== 'page') notFound();
  const legal = params.slug === 'terms' || params.slug === 'privacy';
  return (
    <ContentPage contentKey={key} crumbs={[{ href: '/admin/cms', label: 'CMS' }, { label: CONTENT[key].title }]} back={`/admin/cms/${params.slug}`} reset={!!searchParams.reset}>
      {legal ? (
        <Card title="Legal pages">
          <div className="flex flex-col gap-2">
            <Link href="/admin/cms/terms" className={`adm-btn-outline ${params.slug === 'terms' ? '!border-adm-green !text-adm-green' : ''}`}>Terms of use</Link>
            <Link href="/admin/cms/privacy" className={`adm-btn-outline ${params.slug === 'privacy' ? '!border-adm-green !text-adm-green' : ''}`}>Privacy policy</Link>
          </div>
        </Card>
      ) : undefined}
    </ContentPage>
  );
}
