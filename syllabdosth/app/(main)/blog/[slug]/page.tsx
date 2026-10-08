import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogCard } from '@/components/cards';
import { Arrow, Section } from '@/components/ui';
import { getBlog, listBlog } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { blogPhoto } from '@/lib/images';
import { Photo } from '@/components/motion';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getBlog(params.slug);
  return p ? { title: p.title, description: p.excerpt } : {};
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getBlog(params.slug);
  if (!post) notFound();
  const more = (await listBlog()).filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <>
      <Section>
        <article className="mx-auto max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-deep hover:underline"><Arrow left /> Back to blog</Link>
          <p className="eyebrow mt-6 text-ink-deep">{post.category}</p>
          <h1 className="h1 mt-3">{post.title}</h1>
          <p className="mt-3 text-[14px] text-ink-deep">{post.author} · {fmtDate(post.published_at)} · {post.read_mins} min read</p>
          <Photo src={blogPhoto(post.slug, 1400, post.image_url)} alt={post.title} eager className="mt-8 h-72 w-full rounded-card sm:h-96" />
          <div className="prose-sd mt-10">
            <p className="!text-[19px]">{post.intro}</p>
            {post.sections.map((s, i) => (
              <div key={`${i}-${s.heading}`}>
                <h2>{s.heading}</h2>
                <p>{s.text}</p>
                {post.quote && i === 1 && <blockquote className="my-8 liquid-glass-light rounded-card p-6 font-serif text-[20px] font-bold leading-snug">{post.quote}</blockquote>}
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-card bg-noir p-8 text-white sm:flex-row sm:items-center">
            <p className="font-serif text-[22px] font-bold">Ready to learn this properly?</p>
            <Link href="/courses" className="btn-primary">Explore courses</Link>
          </div>
        </article>
      </Section>
      {more.length > 0 && (
        <Section tone="cream">
          <h2 className="h2 mb-8">Keep reading</h2>
          <div className="grid gap-5 md:grid-cols-2">{more.map((p) => <BlogCard key={p.slug} post={p} />)}</div>
        </Section>
      )}
    </>
  );
}
