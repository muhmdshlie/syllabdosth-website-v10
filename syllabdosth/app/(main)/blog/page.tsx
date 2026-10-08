import type { Metadata } from 'next';
import { BlogCard } from '@/components/cards';
import { PageHeader, Section } from '@/components/ui';
import { listBlog } from '@/lib/data';
import { getContent } from '@/lib/cms/content';

export const metadata: Metadata = { title: 'Blog' };

export default async function BlogPage() {
  const [posts, pages] = await Promise.all([listBlog(), getContent<{ blog: { title: string; sub: string } }>('page.listings')]);
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'Blog' }]} title={pages.blog.title} sub={pages.blog.sub} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => <div key={p.slug} data-reveal style={{ "--d": `${(i % 3) * 0.1}s` } as React.CSSProperties}><BlogCard post={p} /></div>)}
      </div>
    </Section>
  );
}
